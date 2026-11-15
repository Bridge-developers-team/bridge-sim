"""Things that make the plan useful outside the app: an introduction to each
job, typical pay, courses to study, cities, LinkedIn import and job
openings. Numbers and links never come from the AI's own typing: pay is from
official tables or a cited search result, links are search results."""

from __future__ import annotations

import re
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from bridge.api.schemas import (
    CoursesRequest,
    CoursesResponse,
    IntroRequest,
    IntroResponse,
    LinkedInRequest,
    LinkedInResponse,
    PayRequest,
)
from bridge.api.state import AppState, client_key, get_state, pick_writer
from bridge.domain.intro import IntroTooThin, normalize_intro
from bridge.domain.jobs import JobsResult, normalize_country
from bridge.domain.learning import StudyPlan, study_plan
from bridge.domain.pay import Pay
from bridge.domain.roadmap import clamp_hours
from bridge.domain.text import clean
from bridge.services.insights import cities as city_list

router = APIRouter(prefix="/api", tags=["extras"])
State = Annotated[AppState, Depends(get_state)]
_LINKEDIN = re.compile(r"^https://([a-z]{2,3}\.)?(www\.)?linkedin\.com/in/[A-Za-z0-9_%-]{2,100}/?(\?.*)?$")


@router.post("/intro", summary="Meet a job: what it is, the responsibilities and a typical day")
async def intro(body: IntroRequest, request: Request, state: State) -> IntroResponse:
    role = clean(body.role, 80)
    if not role:
        raise HTTPException(400, "Missing the job to introduce.")
    writer, mode = pick_writer(request, state, sample=body.sample)
    draft = await writer.introduce(
        role=role, current_role=clean(body.current_role, 80), country=clean(body.country, 60)
    )
    try:
        return IntroResponse(intro=normalize_intro(role, draft), mode=mode)
    except IntroTooThin as err:
        raise HTTPException(502, "The job introduction came back too thin. Try again.") from err


@router.get("/study", summary="Catalog courses for a role, spread over the 30 days and fitted to the budget")
async def study(
    state: State,
    role: Annotated[str, Query(max_length=120)],
    budget: Annotated[float, Query(ge=0, le=10_000_000)] = 0,
    currency: Annotated[str, Query(max_length=3)] = "USD",
    hours: Annotated[float, Query(ge=0, le=80)] = 5,
) -> StudyPlan:
    if not clean(role, 80):
        raise HTTPException(400, "Missing the role to study for.")
    budget_usd = await state.insights.to_usd(budget, currency)
    return study_plan(role, budget_usd=budget_usd, hours_per_week=clamp_hours(hours))


@router.post("/study/search", summary="Courses, lectures and guides found on the web for this exact role")
async def study_search(body: CoursesRequest, request: Request, state: State) -> CoursesResponse:
    role = clean(body.role, 80)
    if not role:
        raise HTTPException(400, "Missing the role to study for.")
    writer, mode = pick_writer(request, state, sample=body.sample)
    if mode != "live":
        return CoursesResponse(courses=[], mode=mode)
    budget_usd = await state.insights.to_usd(body.budget, body.currency)
    return CoursesResponse(courses=await state.insights.courses(writer, role, budget_usd), mode=mode)


@router.post("/pay", summary="Typical pay for each role: official tables, else a web estimate with its source")
async def pay(body: PayRequest, request: Request, state: State) -> list[Pay | None]:
    roles = [clean(r, 80) for r in body.roles[:5]]
    country = normalize_country(body.country)
    writer = None
    if not body.sample and state.live_writer is not None:
        writer, _ = pick_writer(request, state, sample=False)
    return await state.insights.pay_many(writer, roles, country, clean(body.country_name, 80), clean(body.location, 80))


@router.get("/cities", summary="Cities of one country, largest first, filtered by what the user typed")
async def cities(
    country: Annotated[str, Query(max_length=8)] = "us",
    q: Annotated[str, Query(max_length=60)] = "",
) -> list[str]:
    return city_list(normalize_country(country), q)


@router.post("/linkedin", summary="Read a public LinkedIn profile as a CV (not stored)")
async def linkedin(body: LinkedInRequest, request: Request, state: State) -> LinkedInResponse:
    url = clean(body.url, 300)
    if not _LINKEDIN.match(url):
        raise HTTPException(400, "Paste a LinkedIn profile link, like https://www.linkedin.com/in/your-name")
    writer, mode = pick_writer(request, state, sample=False)
    if mode != "live":
        raise HTTPException(503, "Reading LinkedIn needs the live AI. Upload your LinkedIn PDF instead.")
    text = await writer.read_linkedin(url=url.split("?")[0])
    if not text:
        raise HTTPException(
            422,
            "LinkedIn did not show this profile without a login. On LinkedIn, open your profile, "
            "choose More, then Save to PDF, and upload that file here.",
        )
    return LinkedInResponse(resume_text=text, mode=mode)


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
