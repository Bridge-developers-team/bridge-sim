"""Use case: chosen career + time budget -> the 30-day roadmap."""

from __future__ import annotations

import logging
import uuid
from datetime import UTC, datetime

from bridge.domain.models import Candidate, Career, Roadmap, Track
from bridge.domain.roadmap import IncompleteRoadmap, build_roadmap, check_roadmap
from bridge.llm.base import LlmError, Writer

log = logging.getLogger(__name__)


async def create_roadmap(
    writer: Writer, *, candidate: Candidate, career: Career, track: Track, hours_per_week: float
) -> Roadmap:
    draft = await writer.roadmap(candidate=candidate, career=career, track=track, hours_per_week=hours_per_week)
    try:
        roadmap = build_roadmap(
            draft,
            roadmap_id=str(uuid.uuid4()),
            career=career,
            current_role=candidate.current_role,
            track=track,
            hours_per_week=hours_per_week,
            created_at=datetime.now(UTC).isoformat(timespec="seconds"),
        )
    except IncompleteRoadmap as err:
        raise LlmError("The AI returned an incomplete plan. Try again.", 502) from err
    problems = check_roadmap(roadmap)
    if problems:  # build_roadmap should make this impossible; log loudly if not
        log.error("Roadmap check failed: %s", problems)
    return roadmap
