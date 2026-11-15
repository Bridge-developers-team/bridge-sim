"""Claude writer: structured outputs (Pydantic drafts as the schema), adaptive
thinking at a per-call effort, server-side refusal fallback where the model
has one. Every SDK failure becomes an LlmError with a message the user can
act on."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any, Literal

import anthropic
from anthropic.types import WebFetchTool20250910Param, WebSearchTool20250305Param
from pydantic import BaseModel

from bridge.domain.drafts import (
    CareersDraft,
    CoursePickDraft,
    CoursePicksDraft,
    EvaluationDraft,
    JobIntroDraft,
    LinkedInProfileDraft,
    PayEstimateDraft,
    PracticeDraft,
    RoadmapDraft,
    SampleAnswerDraft,
)
from bridge.domain.models import Candidate, Career, Practice, Track
from bridge.domain.web import Found, harvest, numbered
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


def _as_llm_error(err: Exception, model: str) -> LlmError:
    """SDK failure -> a message the user can act on. Most specific first."""
    if isinstance(err, anthropic.APITimeoutError):
        log.warning("Claude timeout (%s): %s", model, err)
        return LlmError("The AI took too long to answer. Please try again.", 504)
    if isinstance(err, anthropic.AuthenticationError):
        log.error("Claude rejected the API key (%s)", model)
        return LlmError("The AI service rejected the server's key. Tell the team; try demo mode meanwhile.", 503)
    if isinstance(err, anthropic.RateLimitError):
        return LlmError("Too many requests right now. Try again in a minute.", 429)
    if isinstance(err, anthropic.APIConnectionError):
        log.warning("Claude unreachable (%s): %s", model, err)
        return LlmError("Could not reach the AI service. Try again.", 503)
    if isinstance(err, anthropic.APIStatusError):
        log.error("Claude error %s (%s): %s", err.status_code, model, err)
        return LlmError(f"AI service error ({err.status_code}). Try again.", 502)
    raise err


def search_results(content: list[Any]) -> list[Found]:
    """Every result the web search tool returned, in order. An error block
    contributes nothing."""
    found: list[Found] = []
    for block in content:
        if getattr(block, "type", None) != "web_search_tool_result":
            continue
        results = getattr(block, "content", None)
        if not isinstance(results, list):
            continue
        for r in results:
            url = getattr(r, "url", None)
            if isinstance(url, str):
                found.append(Found(url=url, title=getattr(r, "title", "") or "", age=getattr(r, "page_age", "") or ""))
    return found


def fetched_ok(content: list[Any]) -> bool:
    """True if a web fetch returned a document (not an error)."""
    for block in content:
        if getattr(block, "type", None) == "web_fetch_tool_result":
            inner = getattr(block, "content", None)
            if getattr(inner, "type", None) == "web_fetch_result":
                return True
    return False


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
        except anthropic.APIError as err:
            raise _as_llm_error(err, model) from err

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

    # ---------- job introduction, web pay, web courses, LinkedIn ----------

    async def introduce(self, *, role: str, current_role: str, country: str) -> JobIntroDraft:
        return await self._call(
            system=prompts.INTRO_SYSTEM,
            user=prompts.intro_user(role, current_role, country),
            schema=JobIntroDraft,
            effort="low",
            model=self.models.main,
            max_tokens=6000,
        )

    async def _search(self, *, system: str, user: str, domains: list[str] | None = None) -> list[Found]:
        """One web-search turn on the fast model; returns the cleaned results."""
        model = self.models.fast
        tool: WebSearchTool20250305Param = {"type": "web_search_20250305", "name": "web_search", "max_uses": 3}
        if domains:
            tool["allowed_domains"] = domains
        try:
            response = await self._client.messages.create(
                model=model,
                max_tokens=2000,
                system=system,
                messages=[{"role": "user", "content": user}],
                tools=[tool],
            )
        except anthropic.APIError as err:
            raise _as_llm_error(err, model) from err
        return harvest(search_results(response.content))

    async def pay_search(self, *, role: str, place: str) -> tuple[list[Found], PayEstimateDraft | None]:
        found = await self._search(system=prompts.PAY_SEARCH_SYSTEM, user=prompts.pay_search_user(role, place))
        if not found:
            return found, None
        draft = await self._call(
            system=prompts.PAY_PICK_SYSTEM,
            user=prompts.pay_pick_user(role, place, numbered(found)),
            schema=PayEstimateDraft,
            effort="low",
            model=self.models.fast,
            max_tokens=2000,
        )
        return found, draft

    async def course_search(
        self, *, role: str, budget: str, domains: list[str]
    ) -> tuple[list[Found], list[CoursePickDraft]]:
        found = await self._search(
            system=prompts.COURSES_SEARCH_SYSTEM, user=prompts.courses_search_user(role, budget), domains=domains
        )
        if not found:
            return found, []
        draft = await self._call(
            system=prompts.COURSES_PICK_SYSTEM,
            user=prompts.courses_pick_user(role, budget, numbered(found)),
            schema=CoursePicksDraft,
            effort="low",
            model=self.models.fast,
            max_tokens=3000,
        )
        return found, draft.picks

    async def read_linkedin(self, *, url: str) -> str | None:
        """Fetch a public profile with the web fetch tool, then rewrite it as a
        CV. None when LinkedIn shows a login wall or the fetch fails."""
        model = self.models.main
        tool: WebFetchTool20250910Param = {
            "type": "web_fetch_20250910",
            "name": "web_fetch",
            "max_uses": 1,
            "allowed_domains": ["linkedin.com"],
        }
        try:
            response = await self._client.messages.create(
                model=model,
                max_tokens=4000,
                system=prompts.LINKEDIN_SYSTEM,
                messages=[{"role": "user", "content": prompts.linkedin_user(url)}],
                tools=[tool],
            )
        except anthropic.APIError as err:
            raise _as_llm_error(err, model) from err
        if not fetched_ok(response.content):
            return None
        page = "\n".join(getattr(b, "text", "") for b in response.content if getattr(b, "type", None) == "text")
        draft = await self._call(
            system=prompts.LINKEDIN_SYSTEM,
            user="Rewrite this fetched LinkedIn page as a CV. Page notes:\n" + page[:12000],
            schema=LinkedInProfileDraft,
            effort="low",
            model=self.models.fast,
            max_tokens=4000,
        )
        return draft.text if draft.readable and len(draft.text) > 200 else None
