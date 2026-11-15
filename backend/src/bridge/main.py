"""App factory: wires settings, writers, limits, database and routes, and
serves the built front end (one URL, no CORS). Run with:

    uv run uvicorn bridge.main:create_app --factory --reload
"""

from __future__ import annotations

import logging
import secrets
from collections.abc import AsyncGenerator, Callable
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse, HTMLResponse, Response
from fastapi.staticfiles import StaticFiles

from bridge.api import errors
from bridge.api.meta_tags import DEFAULT_DESCRIPTION, DEFAULT_TITLE, PageMeta, proof_meta, render
from bridge.api.routers import extras, journey, meta, proofs
from bridge.api.security import SecurityHeaders, content_security_policy, inline_script_hashes
from bridge.api.state import AppState
from bridge.config import Settings
from bridge.db.engine import create_tables, make_engine, make_sessions
from bridge.db.reference import PayCache, load_reference, seed_reference
from bridge.db.repository import ProofRepository
from bridge.domain import reference
from bridge.domain.reference import Reference
from bridge.llm.base import Writer
from bridge.llm.claude import ClaudeWriter, Models, make_client
from bridge.llm.demo import DemoWriter
from bridge.services.insights import InsightsService
from bridge.services.jobs import Fetch, JobsService, http_fetch
from bridge.services.limits import DailyBudget, SlidingWindow
from bridge.services.proofs import read as read_proof
from bridge.services.signing import Signer
from bridge.services.videos import VideosService

log = logging.getLogger("bridge")


def _live_writer(settings: Settings, meter: Callable[[], bool]) -> Writer | None:
    if settings.provider != "anthropic":
        return None
    if not settings.anthropic_api_key:
        raise RuntimeError("LLM_PROVIDER=anthropic needs ANTHROPIC_API_KEY.")
    client = make_client(settings.anthropic_api_key.get_secret_value())
    return ClaudeWriter(client, Models(main=settings.bridge_model, fast=settings.bridge_model_fast), meter=meter)


def _secret(settings: Settings) -> str:
    if settings.secret_key:
        return settings.secret_key.get_secret_value()
    log.warning("SECRET_KEY is not set: using a random key; open practice tasks break on restart.")
    return secrets.token_urlsafe(32)


def create_app(
    settings: Settings | None = None,
    *,
    live_writer: Writer | None = None,
    jobs_fetch: Fetch = http_fetch,
    videos_fetch: Fetch = http_fetch,
) -> FastAPI:
    """`live_writer` and the fetch functions let tests inject fakes; otherwise they come from settings."""
    settings = settings or Settings()
    engine = make_engine(settings.database_url)

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncGenerator[None]:
        await create_tables(engine)
        # Reference data (countries, cities, job titles, courses, pay tables):
        # seeded from db/seed/ when those files changed, then held in memory.
        if await seed_reference(engine):
            log.info("Reference data seeded")
        reference.install(Reference.from_data(await load_reference(engine)))
        yield
        await engine.dispose()

    app = FastAPI(title="Bridge", lifespan=lifespan, docs_url="/api/docs", openapi_url="/api/openapi.json")
    ai_per_day = DailyBudget(settings.ai_calls_per_day)
    writer = live_writer if live_writer is not None else _live_writer(settings, ai_per_day.take)
    if live_writer is not None and hasattr(live_writer, "meter"):
        setattr(live_writer, "meter", ai_per_day.take)  # noqa: B010  (injected writers, tests: charged the same way)
    app.state.bridge = AppState(
        settings=settings,
        live_writer=writer,
        demo_writer=DemoWriter(),
        signer=Signer(_secret(settings)),
        proofs=ProofRepository(make_sessions(engine)),
        ai_per_client=SlidingWindow(settings.ai_calls_per_client, settings.ai_window_seconds),
        ai_per_day=ai_per_day,
        proofs_per_client=SlidingWindow(settings.proofs_per_client_per_hour, 3600),
        jobs=JobsService(
            settings.adzuna_app_id,
            settings.adzuna_app_key.get_secret_value() if settings.adzuna_app_key else None,
            fetch=jobs_fetch,
        ),
        jobs_per_client=SlidingWindow(settings.jobs_per_client, 600),
        insights=InsightsService(PayCache(engine)),
        videos=VideosService(
            settings.youtube_api_key.get_secret_value() if settings.youtube_api_key else None, fetch=videos_fetch
        ),
        videos_per_client=SlidingWindow(settings.videos_per_client, 600),
    )
    app.add_middleware(GZipMiddleware, minimum_size=1024)
    app.add_middleware(
        SecurityHeaders, csp=content_security_policy(inline_script_hashes(settings.static_dir / "index.html"))
    )
    errors.install(app)
    app.include_router(meta.router)
    app.include_router(journey.router)
    app.include_router(proofs.router)
    app.include_router(extras.router)
    _serve_front_end(app, settings.static_dir)
    log.info("Bridge ready (%s mode)", "demo" if writer is None else "live")
    return app


def _serve_front_end(app: FastAPI, static_dir: Path) -> None:
    """Hashed assets are cached for a year; every other path that is not an
    API route gets index.html, so client-side routes (/p/abc) load directly."""
    index = static_dir / "index.html"
    if not index.is_file():
        log.warning("No front end at %s; run `npm run build` in frontend/. API only.", static_dir)
        return
    app.mount("/assets", _ImmutableStatic(directory=static_dir / "assets"), name="assets")

    template = index.read_text(encoding="utf-8")
    default = PageMeta(DEFAULT_TITLE, DEFAULT_DESCRIPTION)

    @app.get("/{path:path}", include_in_schema=False)
    async def spa(path: str, request: Request) -> Response:
        if path.startswith("api/"):
            raise HTTPException(404, "No such API route.")
        file = (static_dir / path).resolve()
        if path and file.is_file() and file.is_relative_to(static_dir.resolve()):
            return FileResponse(file)
        meta = default
        if path.startswith("p/"):
            # A shared proof previews with the person's role and score.
            try:
                proof = await read_proof(request.app.state.bridge.proofs, path[2:].strip("/"))
            except Exception as err:  # the page must load even if the database hiccups
                log.warning("Proof preview lookup failed: %s", err)
                proof = None
            if proof:
                meta = proof_meta(proof)
        html = render(template, meta, str(request.base_url), path)
        return HTMLResponse(html, headers={"Cache-Control": "no-cache"})


class _ImmutableStatic(StaticFiles):
    async def get_response(self, path, scope):  # type: ignore[no-untyped-def]
        response = await super().get_response(path, scope)
        if response.status_code == 200:
            response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
        return response
