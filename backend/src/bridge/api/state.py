"""Everything a request handler needs, built once at start-up (main.py) and
kept on app.state. Tests build their own with fakes."""

from __future__ import annotations

from dataclasses import dataclass

from fastapi import HTTPException, Request

from bridge.config import Settings
from bridge.db.repository import ProofRepository
from bridge.domain.models import Mode
from bridge.llm.base import Writer
from bridge.services.jobs import JobsService
from bridge.services.limits import DailyBudget, SlidingWindow
from bridge.services.signing import Signer


@dataclass
class AppState:
    settings: Settings
    live_writer: Writer | None  # None in demo mode
    demo_writer: Writer
    signer: Signer
    proofs: ProofRepository
    ai_per_client: SlidingWindow
    ai_per_day: DailyBudget
    proofs_per_client: SlidingWindow
    jobs: JobsService
    jobs_per_client: SlidingWindow

    @property
    def demo_mode(self) -> bool:
        return self.live_writer is None


def get_state(request: Request) -> AppState:
    return request.app.state.bridge


def client_key(request: Request) -> str:
    """The caller's IP. Behind Render's proxy this is only right because uvicorn
    runs with --proxy-headers (Dockerfile); without it every visitor would share
    the proxy's address and one limit."""
    return request.client.host if request.client else "unknown"


def pick_writer(request: Request, state: AppState, *, sample: bool) -> tuple[Writer, Mode]:
    """Live AI unless the server has no key (demo) or the user asked for
    labeled sample data (sample). Only live calls count against the limits."""
    if state.live_writer is None:
        return state.demo_writer, "demo"
    if sample:
        return state.demo_writer, "sample"
    if not state.ai_per_client.allow(client_key(request)):
        raise HTTPException(429, "Too many AI requests from this browser. Wait a few minutes and try again.")
    if not state.ai_per_day.take():
        raise HTTPException(
            503, "Today's AI allowance for this demo is used up. Use the labeled sample data, or come back tomorrow."
        )
    return state.live_writer, "live"
