"""Things that make the plan useful outside the app: learning links found on
the web, and job openings near the user."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from bridge.api.schemas import ResourcesRequest, ResourcesResponse
from bridge.api.state import AppState, client_key, get_state, pick_writer
from bridge.domain.jobs import JobsResult
from bridge.domain.text import clean

router = APIRouter(prefix="/api", tags=["extras"])
State = Annotated[AppState, Depends(get_state)]


@router.post("/resources", summary="Real articles and videos for one week of the plan")
async def resources(body: ResourcesRequest, request: Request, state: State) -> ResourcesResponse:
    topic, role = clean(body.topic, 200), clean(body.role, 80)
    if not topic or not role:
        raise HTTPException(400, "Missing the role or what to learn.")
    writer, mode = pick_writer(request, state, sample=body.sample)
    return ResourcesResponse(resources=await writer.resources(topic=topic, role=role), mode=mode)


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
