"""One error shape for the front end: {"detail": "<message a person can act on>"}."""

from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from bridge.llm.base import LlmError
from bridge.services.practice import TamperedError

log = logging.getLogger(__name__)


def install(app: FastAPI) -> None:
    @app.exception_handler(LlmError)
    async def llm_error(_: Request, err: LlmError) -> JSONResponse:
        return JSONResponse({"detail": err.message}, status_code=err.status)

    @app.exception_handler(TamperedError)
    async def tampered(_: Request, err: TamperedError) -> JSONResponse:
        return JSONResponse({"detail": str(err)}, status_code=400)

    @app.exception_handler(RequestValidationError)
    async def invalid(_: Request, err: RequestValidationError) -> JSONResponse:
        # The front end always sends well-formed bodies; a failure here means a
        # stale tab or a hand-made request. Say so plainly, log the specifics.
        # Where and why only: never the submitted values (a CV must not reach the logs).
        log.info("Rejected request body: %s", [(e.get("loc"), e.get("type")) for e in err.errors()[:3]])
        return JSONResponse({"detail": "That request was incomplete. Reload the page and try again."}, status_code=400)

    @app.exception_handler(Exception)
    async def unexpected(_: Request, err: Exception) -> JSONResponse:
        log.exception("Unhandled error", exc_info=err)
        return JSONResponse({"detail": "Something went wrong on our side. Try again."}, status_code=500)
