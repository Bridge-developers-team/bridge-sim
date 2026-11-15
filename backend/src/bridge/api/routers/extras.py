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

router = APIRouter(prefix="/api", tags=["extras"])
State = Annotated[AppState, Depends(get_state)]


@router.get("/study", summary="Courses for a role: the main one spread over the 30 days, plus other options")
async def study(
    role: Annotated[str, Query(max_length=120)],
    paid: bool = False,
    hours: Annotated[float, Query(ge=0, le=80)] = 5,
) -> StudyPlan:
    if not clean(role, 80):
        raise HTTPException(400, "Missing the role to study for.")
    return study_plan(role, paid=paid, hours_per_week=clamp_hours(hours))


@router.get("/pay", summary="Typical pay for each role where the user lives, from official statistics")
async def pay(
    role: Annotated[list[str], Query(max_length=120)],
    country: Annotated[str, Query(max_length=8)] = "us",
    location: Annotated[str, Query(max_length=120)] = "",
) -> list[Pay | None]:
    roles = [clean(r, 80) for r in role[:5]]
    return [pay_for(r, normalize_country(country), location) if r else None for r in roles]


@router.get("/jobs", summary="Job openings for a role near a city")
async def jobs(
    request: Request,
    state: State,
    role: Annotated[str, Query(max_length=120)],
    city: Annotated[str, Query(max_length=120)] = "",
    country: Annotated[str, Query(max_length=8)] = "us",
) -> JobsResult:
    if not clean(role, 80):
        raise HTTPException(400, "Missing the role to search for.")
    if not state.jobs_per_client.allow(client_key(request)):
        raise HTTPException(429, "Too many job searches from this browser. Try again in a few minutes.")
    return await state.jobs.find(role=role, city=city, country=country)
