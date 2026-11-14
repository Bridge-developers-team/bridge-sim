"""The Claude writer, against a fake SDK client: request shape and error mapping.
No network, no spend."""

from __future__ import annotations

from types import SimpleNamespace

import anthropic
import httpx2 as httpx  # the SDK is built on httpx2
import pytest

from bridge.domain.drafts import CareersDraft, SampleAnswerDraft
from bridge.domain.models import Candidate
from bridge.llm.base import LlmError
from bridge.llm.claude import FALLBACK_BETA, ClaudeWriter, Models


class FakeMessages:
    def __init__(self, result=None, error: Exception | None = None) -> None:
        self.result, self.error, self.kwargs = result, error, None

    async def parse(self, **kwargs):
        self.kwargs = kwargs
        if self.error:
            raise self.error
        return self.result


def writer(result=None, error=None) -> tuple[ClaudeWriter, FakeMessages]:
    messages = FakeMessages(result, error)
    client = SimpleNamespace(beta=SimpleNamespace(messages=messages))
    return ClaudeWriter(client, Models()), messages  # type: ignore[arg-type]


def response(parsed, stop_reason: str = "end_turn"):
    return SimpleNamespace(parsed_output=parsed, stop_reason=stop_reason)


CAREERS = CareersDraft.model_validate(
    {"profile": {"current_role": "T", "years_experience": 1, "industry": "", "evidence_note": ""}, "careers": []}
)


async def test_main_model_gets_structured_output_effort_and_refusal_fallback():
    w, messages = writer(response(CAREERS))

    await w.careers(resume="resume text", candidate=Candidate())

    assert messages.kwargs["model"] == "claude-sonnet-5-5"
    assert messages.kwargs["output_format"] is CareersDraft
    assert messages.kwargs["output_config"] == {"effort": "medium"}
    assert messages.kwargs["betas"] == [FALLBACK_BETA] and messages.kwargs["fallbacks"] == "default"
    assert "<resume>\nresume text\n</resume>" in messages.kwargs["messages"][0]["content"]


async def test_haiku_gets_no_fallback_because_it_has_none(practice):
    w, messages = writer(response(SampleAnswerDraft(answer="hi")))

    assert await w.sample_answer(practice=practice, candidate=Candidate()) == "hi"
    assert messages.kwargs["model"] == "claude-haiku-5-5"
    assert "betas" not in messages.kwargs and "fallbacks" not in messages.kwargs


@pytest.fixture
def practice():
    from bridge.domain.models import Practice, RubricCriterion

    return Practice(
        id="p",
        target_role="Analyst",
        scenario="s",
        brief="b",
        expected_deliverable="d",
        timebox_minutes=10,
        rubric=[RubricCriterion(id="c1", label="l", description="d", max_score=3)],
    )


_REQUEST = httpx.Request("POST", "https://api.anthropic.com/v1/messages")


def _status(cls, code: int):
    return cls("boom", response=httpx.Response(code, request=_REQUEST), body=None)


@pytest.mark.parametrize(
    ("error", "status"),
    [
        (anthropic.APITimeoutError(request=_REQUEST), 504),
        (anthropic.APIConnectionError(request=_REQUEST), 503),
        (_status(anthropic.AuthenticationError, 401), 503),
        (_status(anthropic.RateLimitError, 429), 429),
        (_status(anthropic.InternalServerError, 500), 502),
    ],
)
async def test_sdk_errors_become_messages_a_person_can_act_on(error, status):
    w, _ = writer(error=error)

    with pytest.raises(LlmError) as caught:
        await w.careers(resume="r", candidate=Candidate())

    assert caught.value.status == status
    assert "boom" not in caught.value.message


@pytest.mark.parametrize(
    ("stop_reason", "parsed", "status"), [("refusal", None, 422), ("max_tokens", None, 502), ("end_turn", None, 502)]
)
async def test_refusals_cutoffs_and_unreadable_output_are_errors(stop_reason, parsed, status):
    w, _ = writer(response(parsed, stop_reason))

    with pytest.raises(LlmError) as caught:
        await w.careers(resume="r", candidate=Candidate())

    assert caught.value.status == status


async def test_real_sdk_sends_our_schema_and_parses_the_reply():
    """Through the real SDK with a mocked transport: proves the request the API
    receives (schema, effort, beta header, fallbacks) and that parsing works."""
    import json

    from bridge.llm.claude import make_client

    seen: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["body"] = json.loads(request.content)
        seen["beta"] = request.headers.get("anthropic-beta", "")
        text = CAREERS.model_dump_json()
        return httpx.Response(
            200,
            json={
                "id": "msg_1",
                "type": "message",
                "role": "assistant",
                "model": "claude-sonnet-5-5",
                "content": [{"type": "text", "text": text}],
                "stop_reason": "end_turn",
                "stop_sequence": None,
                "usage": {"input_tokens": 1, "output_tokens": 1},
            },
        )

    client = make_client("test-key")
    client = client.with_options(http_client=anthropic.DefaultAsyncHttpxClient(transport=httpx.MockTransport(handler)))
    draft = await ClaudeWriter(client).careers(resume="r", candidate=Candidate())

    assert draft == CAREERS
    body = seen["body"]
    assert body["output_config"]["effort"] == "medium"
    assert body["output_config"]["format"]["type"] == "json_schema"
    assert "careers" in body["output_config"]["format"]["schema"]["properties"]
    assert body["fallbacks"] == "default"
    assert FALLBACK_BETA in seen["beta"]


async def test_resources_come_only_from_real_search_results_picked_by_number():
    """Real SDK, mocked transport: first the web search turn, then the pick."""
    import json

    from bridge.llm.claude import make_client

    bodies: list[dict] = []

    def message(content):
        return {
            "id": "msg",
            "type": "message",
            "role": "assistant",
            "model": "claude-haiku-5-5",
            "content": content,
            "stop_reason": "end_turn",
            "stop_sequence": None,
            "usage": {"input_tokens": 1, "output_tokens": 1},
        }

    def handler(request: httpx.Request) -> httpx.Response:
        bodies.append(json.loads(request.content))
        if len(bodies) == 1:
            return httpx.Response(
                200,
                json=message(
                    [
                        {"type": "server_tool_use", "id": "srvtoolu_1", "name": "web_search", "input": {"query": "q"}},
                        {
                            "type": "web_search_tool_result",
                            "tool_use_id": "srvtoolu_1",
                            "content": [
                                {
                                    "type": "web_search_result",
                                    "url": "https://example.org/storyboards",
                                    "title": "Storyboards 101",
                                    "encrypted_content": "x",
                                    "page_age": "2025",
                                },
                                {
                                    "type": "web_search_result",
                                    "url": "https://www.youtube.com/watch?v=abc",
                                    "title": "Storyboarding tutorial",
                                    "encrypted_content": "y",
                                    "page_age": None,
                                },
                            ],
                        },
                        {"type": "text", "text": "done"},
                    ]
                ),
            )
        picks = {
            "picks": [{"index": 7, "why": "invented"}, {"index": 1, "why": "Clear demo"}, {"index": 0, "why": "Basics"}]
        }
        return httpx.Response(200, json=message([{"type": "text", "text": json.dumps(picks)}]))

    client = make_client("test-key").with_options(
        http_client=anthropic.DefaultAsyncHttpxClient(transport=httpx.MockTransport(handler))
    )
    found = await ClaudeWriter(client).resources(topic="Storyboarding", role="Instructional Designer")

    assert [(r.kind, r.url) for r in found] == [
        ("article", "https://example.org/storyboards"),
        ("video", "https://www.youtube.com/watch?v=abc"),
    ]
    assert bodies[0]["tools"][0]["type"] == "web_search_20250305"
    assert bodies[0]["model"] == "claude-haiku-5-5"
    assert "[0] Storyboards 101 (example.org, 2025)" in bodies[1]["messages"][0]["content"]
