"""The journey: careers -> roadmap -> practice -> feedback. Thin handlers:
validate input, pick the writer, call one service, shape the response."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request

from bridge.api.schemas import (
    MAX_ANSWER,
    MAX_RESUME,
    MIN_RESUME,
    CareersRequest,
    CareersResponse,
    EvaluateRequest,
    EvaluateResponse,
    PracticeRequest,
    PracticeResponse,
    ProfileOut,
    RoadmapRequest,
    RoadmapResponse,
    SampleAnswerRequest,
    SampleAnswerResponse,
)
from bridge.api.state import AppState, get_state, pick_writer
from bridge.domain.careers import bound_career
from bridge.domain.models import Career
from bridge.domain.practice import MIN_ANSWER_WORDS, word_count
from bridge.domain.profile import read_candidate
from bridge.domain.roadmap import clamp_hours, normalize_track
from bridge.domain.text import clean
from bridge.services.careers import recommend_careers
from bridge.services.practice import create_practice, grade_answer
from bridge.services.roadmap import create_roadmap

router = APIRouter(prefix="/api", tags=["journey"])
State = Annotated[AppState, Depends(get_state)]


def _career(raw: Career) -> Career:
    career = bound_career(raw)
    if not career.title:
        raise HTTPException(400, "Pick a career path first.")
    return career


@router.post("/careers", summary="Three career paths from a resume and constraints")
async def careers(body: CareersRequest, request: Request, state: State) -> CareersResponse:
    resume = body.resume_text.strip()
    if len(resume) < MIN_RESUME:
        raise HTTPException(400, "Add a bit more about your experience (a few lines at least).")
    if len(resume) > MAX_RESUME:
        raise HTTPException(400, f"Your resume is too long. Keep it under {MAX_RESUME:,} characters.")
    writer, mode = pick_writer(request, state, sample=body.sample)
    profile, paths = await recommend_careers(
        writer, resume=resume, candidate=read_candidate(body.profile), source=body.source
    )
    return CareersResponse(
        profile=ProfileOut(
            current_role=profile.current_role,
            years_experience=profile.years_experience,
            industry=profile.industry,
            evidence_note=profile.evidence_note,
            standout=profile.standout,
        ),
        careers=paths,
        mode=mode,
    )


@router.post("/roadmap", summary="The 30-day plan for one career path")
async def roadmap(body: RoadmapRequest, request: Request, state: State) -> RoadmapResponse:
    career = _career(body.career)
    candidate = read_candidate(body.profile)
    track = normalize_track(body.track or candidate.transition_preference)
    hours = clamp_hours(body.hours_per_week if body.hours_per_week is not None else candidate.hours_per_week)
    writer, mode = pick_writer(request, state, sample=body.sample)
    plan = await create_roadmap(writer, candidate=candidate, career=career, track=track, hours_per_week=hours)
    return RoadmapResponse(roadmap=plan, mode=mode)


@router.post("/practice", summary="One realistic practice task for a roadmap task")
async def practice(body: PracticeRequest, request: Request, state: State) -> PracticeResponse:
    career = _career(body.career)
    task_id, title = clean(body.task.id, 80), clean(body.task.title, 200)
    if not task_id or not title:
        raise HTTPException(400, "Missing roadmap task.")
    writer, mode = pick_writer(request, state, sample=body.sample)
    issued = await create_practice(
        writer,
        state.signer,
        candidate=read_candidate(body.profile),
        career=career,
        task_id=task_id,
        task_title=title,
        task_deliverable=clean(body.task.deliverable, 400),
    )
    return PracticeResponse(practice=issued.practice, practice_token=issued.token, mode=mode)


@router.post("/practice/evaluate", summary="Rubric feedback on an answer; quotes checked by code")
async def evaluate(body: EvaluateRequest, request: Request, state: State) -> EvaluateResponse:
    answer = body.answer.strip()
    if word_count(answer) < MIN_ANSWER_WORDS:
        raise HTTPException(
            400, f"Write at least a few sentences ({MIN_ANSWER_WORDS}+ words) before asking for feedback."
        )
    if len(answer) > MAX_ANSWER:
        raise HTTPException(400, f"Your answer is too long. Keep it under {MAX_ANSWER:,} characters.")
    writer, mode = pick_writer(request, state, sample=body.sample)
    graded = await grade_answer(
        writer, state.signer, practice=body.practice, practice_token=body.practice_token, answer=answer, mode=mode
    )
    return EvaluateResponse(evaluation=graded.evaluation, result_token=graded.token, mode=mode)


@router.post("/practice/sample-answer", summary="A labeled sample answer, so a demo can move fast")
async def sample_answer(body: SampleAnswerRequest, request: Request, state: State) -> SampleAnswerResponse:
    writer, mode = pick_writer(request, state, sample=body.sample)
    text = await writer.sample_answer(practice=body.practice, candidate=read_candidate(body.profile))
    return SampleAnswerResponse(answer=text.strip()[:MAX_ANSWER], mode=mode)
