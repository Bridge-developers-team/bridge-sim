"""Things that make the plan useful outside the app: courses to study,
typical pay for a role, and job openings near the user. None of it is
written by the AI."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from bridge.api.state import AppState, client_key, get_state
from bridge.domain.jobs import JobsResult, normalize_country
from bridge.domain.learning import StudyPlan, study_plan
from bridge.domain.pay import Pay, pay_for
from bridge.domain.roadmap import clamp_hours
from bridge.domain.text import clean
from bridge.domain.videos import MAX_QUERIES, VideosResult

router = APIRouter(prefix="/api", tags=["extras"])
State = Annotated[AppState, Depends(get_state)]


@router.get("/study", summary="Courses for a role: the main one spread over the 30 days, plus other options")
async def study(
    role: Annotated[str, Query(max_length=120)],
    paid: bool = False,
    hours: Annotated[float, Query(ge=0, le=80)] = 5,
    field: Annotated[str, Query(max_length=40)] = "",
) -> StudyPlan:
    if not clean(role, 80):
        raise HTTPException(400, "Missing the role to study for.")
    return study_plan(role, paid=paid, hours_per_week=clamp_hours(hours), field_id=clean(field, 40))


@router.get("/pay", summary="Typical pay for each role where the user lives, from official statistics")
async def pay(
    role: Annotated[list[str], Query(max_length=120)],
    country: Annotated[str, Query(max_length=8)] = "us",
    location: Annotated[str, Query(max_length=120)] = "",
    field: Annotated[list[str] | None, Query(max_length=40)] = None,
) -> list[Pay | None]:
    """`field` (optional, one per role, same order) is the study field the AI
    chose for each career; without it the role title decides."""
    roles = [clean(r, 80) for r in role[:5]]
    fields = [clean(f, 40) for f in (field or [])]
    return [
        pay_for(r, normalize_country(country), location, fields[i] if i < len(fields) else "") if r else None
        for i, r in enumerate(roles)
    ]


@router.get("/jobs", summary="Job openings for a role near a city")
async def jobs(
    request: Request,
    state: State,
    role: Annotated[str, Query(max_length=120)],
    city: Annotated[str, Query(max_length=120)] = "",
    country: Annotated[str, Query(max_length=8)] = "us",
    field: Annotated[str, Query(max_length=40)] = "",
) -> JobsResult:
    if not clean(role, 80):
        raise HTTPException(400, "Missing the role to search for.")
    if not state.jobs_per_client.allow(client_key(request)):
        raise HTTPException(429, "Too many job searches from this browser. Try again in a few minutes.")
    return await state.jobs.find(role=role, city=city, country=country, field=field)


@router.get("/videos", summary="The best English YouTube video for each search phrase of a path")
async def videos(
    request: Request,
    state: State,
    role: Annotated[str, Query(max_length=120)],
    q: Annotated[list[str] | None, Query(max_length=120)] = None,
) -> VideosResult:
    """`q`: the path's video searches (career.videoSearches), at most 3. Without
    any, one broad phrase about the role is used."""
    if not clean(role, 80):
        raise HTTPException(400, "Missing the role to find videos for.")
    if not state.videos.live:
        return VideosResult(source="off", videos=[])
    if not state.videos_per_client.allow(client_key(request)):
        raise HTTPException(429, "Too many video searches from this browser. Try again in a few minutes.")
    return await state.videos.find(phrases=(q or [])[:MAX_QUERIES], role=role)
