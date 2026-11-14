from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends

from bridge.api.schemas import ConfigResponse, Limits, SampleOut, TrackOut
from bridge.api.state import AppState, get_state
from bridge.domain.roadmap import MAX_HOURS, MIN_HOURS, TRACKS
from bridge.domain.samples import DEMO_PERSONA, SAMPLES

router = APIRouter(tags=["meta"])
State = Annotated[AppState, Depends(get_state)]


@router.get("/healthz", summary="Liveness for Render and the uptime pinger")
async def healthz(state: State) -> dict[str, object]:
    # Deliberately no database query: this is hit every few minutes, and
    # touching Neon would keep its free compute awake around the clock.
    commit = state.settings.render_git_commit
    return {"ok": True, "mode": "demo" if state.demo_mode else "live", "commit": commit[:7] if commit else "local"}


@router.get("/api/config", summary="Samples, tracks and limits the front end needs")
async def config(state: State) -> ConfigResponse:
    return ConfigResponse(
        mode="demo" if state.demo_mode else "live",
        samples=[SampleOut(id=s.id, label=s.label, resume=s.resume) for s in SAMPLES],
        demo_persona=DEMO_PERSONA,
        tracks=[TrackOut(id=k, label=v.label, summary=v.summary) for k, v in TRACKS.items()],
        limits=Limits(min_hours=MIN_HOURS, max_hours=MAX_HOURS),
    )
