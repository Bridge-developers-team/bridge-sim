"""Claude writer: structured outputs (Pydantic drafts as the schema), adaptive
thinking at a per-call effort, server-side refusal fallback where the model
has one. Every SDK failure becomes an LlmError with a message the user can
act on."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any, Literal

import anthropic
from pydantic import BaseModel

from bridge.domain.drafts import (
    CareersDraft,
    EvaluationDraft,
    PracticeDraft,
    RoadmapDraft,
    SampleAnswerDraft,
)
from bridge.domain.models import Candidate, Career, Practice, Track
from bridge.llm import prompts
from bridge.llm.base import LlmError

log = logging.getLogger(__name__)

FALLBACK_BETA = "server-side-fallback-2026-07-01"
Effort = Literal["low", "medium", "high", "xhigh", "max"]


@dataclass(frozen=True)
class Models:
    main: str = "claude-sonnet-5-5"  # judgment: careers, roadmap, practice, feedback
    fast: str = "claude-haiku-5-5"  # drafts: sample answers


def make_client(api_key: str) -> anthropic.AsyncAnthropic:
    # 120 s per attempt and 1 retry keeps a request well under the browser's
    # patience and the server's socket timeout.
    return anthropic.AsyncAnthropic(api_key=api_key, timeout=120.0, max_retries=1)


def _fallback_args(model: str) -> dict[str, Any]:
    """On a safety decline the API re-runs the request on a fallback model in
    the same call. Haiku has no server-side fallback, so it gets none."""
    if "haiku" in model:
        return {}
    return {"betas": [FALLBACK_BETA], "fallbacks": "default"}


class ClaudeWriter:
    def __init__(self, client: anthropic.AsyncAnthropic, models: Models | None = None) -> None:
        self._client = client
        self.models = models or Models()

    async def _call[T: BaseModel](
        self,
        *,
        system: str,
        user: str,
        schema: type[T],
        effort: Effort,
        model: str,
        max_tokens: int = 16000,
    ) -> T:
        try:
            response = await self._client.beta.messages.parse(
                model=model,
                max_tokens=max_tokens,
                system=system,
                messages=[{"role": "user", "content": user}],
                output_config={"effort": effort},
                output_format=schema,
                **_fallback_args(model),
            )
        except anthropic.APITimeoutError as err:
            log.warning("Claude timeout (%s): %s", model, err)
            raise LlmError("The AI took too long to answer. Please try again.", 504) from err
        except anthropic.AuthenticationError as err:
            log.error("Claude rejected the API key (%s)", model)
            raise LlmError(
                "The AI service rejected the server's key. Tell the team; try demo mode meanwhile.", 503
            ) from err
        except anthropic.RateLimitError as err:
            raise LlmError("Too many requests right now. Try again in a minute.", 429) from err
        except anthropic.APIConnectionError as err:
            log.warning("Claude unreachable (%s): %s", model, err)
            raise LlmError("Could not reach the AI service. Try again.", 503) from err
        except anthropic.APIStatusError as err:
            log.error("Claude error %s (%s): %s", err.status_code, model, err)
            raise LlmError(f"AI service error ({err.status_code}). Try again.", 502) from err

        if response.stop_reason == "refusal":
            raise LlmError("The AI declined this request. Try different text.", 422)
        if response.stop_reason == "max_tokens":
            raise LlmError("The AI response was cut off. Try again.", 502)
        parsed = response.parsed_output
        if parsed is None:
            raise LlmError("The AI returned an unreadable answer. Try again.", 502)
        return parsed

    async def careers(self, *, resume: str, candidate: Candidate) -> CareersDraft:
        return await self._call(
            system=prompts.CAREERS_SYSTEM,
            user=prompts.careers_user(resume, candidate),
            schema=CareersDraft,
            effort="medium",
            model=self.models.main,
        )

    async def roadmap(
        self, *, candidate: Candidate, career: Career, track: Track, hours_per_week: float
    ) -> RoadmapDraft:
        return await self._call(
            system=prompts.ROADMAP_SYSTEM,
            user=prompts.roadmap_user(candidate, career, track, hours_per_week),
            schema=RoadmapDraft,
            effort="low",
            model=self.models.main,
        )

    async def practice(
        self, *, candidate: Candidate, career: Career, task_title: str, task_deliverable: str
    ) -> PracticeDraft:
        return await self._call(
            system=prompts.PRACTICE_SYSTEM,
            user=prompts.practice_user(candidate, career, task_title, task_deliverable),
            schema=PracticeDraft,
            effort="low",
            model=self.models.main,
        )

    async def evaluate(self, *, practice: Practice, answer: str) -> EvaluationDraft:
        return await self._call(
            system=prompts.EVALUATION_SYSTEM,
            user=prompts.evaluation_user(practice, answer),
            schema=EvaluationDraft,
            effort="medium",
            model=self.models.main,
        )

    async def sample_answer(self, *, practice: Practice, candidate: Candidate) -> str:
        draft = await self._call(
            system=prompts.SAMPLE_SYSTEM,
            user=prompts.sample_user(practice, candidate),
            schema=SampleAnswerDraft,
            effort="low",
            model=self.models.fast,
            max_tokens=3000,
        )
        return draft.answer
