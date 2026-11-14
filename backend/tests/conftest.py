"""API test harness. Each test gets a fresh app, a fresh SQLite file (or the
Postgres in TEST_DATABASE_URL, which CI sets) and, for live mode, a fake AI
writer that records calls instead of spending money."""

from __future__ import annotations

import os
from collections.abc import Callable, Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from bridge.config import Settings
from bridge.domain.models import Candidate, Career, Practice, Track
from bridge.llm.demo import DemoWriter
from bridge.main import create_app


class FakeWriter(DemoWriter):
    """Answers like the demo writer (fast, deterministic) but counts calls,
    and can be told to fail."""

    def __init__(self) -> None:
        self.calls: list[str] = []
        self.fail_with: Exception | None = None

    def _hit(self, name: str) -> None:
        self.calls.append(name)
        if self.fail_with:
            raise self.fail_with

    async def careers(self, *, resume: str, candidate: Candidate):
        self._hit("careers")
        return await super().careers(resume=resume, candidate=candidate)

    async def roadmap(self, *, candidate: Candidate, career: Career, track: Track, hours_per_week: float):
        self._hit("roadmap")
        return await super().roadmap(candidate=candidate, career=career, track=track, hours_per_week=hours_per_week)

    async def practice(self, *, candidate: Candidate, career: Career, task_title: str, task_deliverable: str):
        self._hit("practice")
        return await super().practice(
            candidate=candidate, career=career, task_title=task_title, task_deliverable=task_deliverable
        )

    async def evaluate(self, *, practice: Practice, answer: str):
        self._hit("evaluate")
        return await super().evaluate(practice=practice, answer=answer)


def _db_url(tmp_path: Path) -> str:
    return os.environ.get("TEST_DATABASE_URL") or f"sqlite+aiosqlite:///{tmp_path / 'test.db'}"


@pytest.fixture
def make_client(tmp_path: Path) -> Iterator[Callable[..., TestClient]]:
    opened: list[TestClient] = []

    def build(*, writer: FakeWriter | None = None, static_dir: Path | None = None, **overrides: object) -> TestClient:
        settings = Settings(
            _env_file=None,  # type: ignore[call-arg]  # never read a developer's .env in tests
            llm_provider="demo" if writer is None else "anthropic",
            anthropic_api_key="test-key" if writer else None,  # type: ignore[arg-type]
            database_url=_db_url(tmp_path),
            secret_key="test-secret-key-0123456789",  # type: ignore[arg-type]
            static_dir=static_dir or tmp_path / "no-front-end",
            **overrides,  # type: ignore[arg-type]
        )
        client = TestClient(create_app(settings, live_writer=writer), raise_server_exceptions=False)
        client.__enter__()  # runs the lifespan: creates tables
        opened.append(client)
        return client

    yield build
    for client in opened:
        client.__exit__(None, None, None)


@pytest.fixture
def demo(make_client: Callable[..., TestClient]) -> TestClient:
    return make_client()


@pytest.fixture
def fake_ai() -> FakeWriter:
    return FakeWriter()


@pytest.fixture
def live(make_client: Callable[..., TestClient], fake_ai: FakeWriter) -> TestClient:
    return make_client(writer=fake_ai)
