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
    {
        "profile": {"current_role": "T", "years_experience": 1, "industry": "", "evidence_note": "", "standout": ""},
        "careers": [],
    }
)


async def test_main_model_gets_structured_output_effort_and_refusal_fallback():
    w, messages = writer(response(CAREERS))

    await w.careers(resume="resume text", candidate=Candidate())

    assert messages.kwargs["model"] == "claude-sonnet-5-5"
    assert messages.kwargs["output_format"] is CareersDraft
    assert messages.kwargs["output_config"] == {"effort": "medium"}
    assert messages.kwargs["betas"] == [FALLBACK_BETA] and messages.kwargs["fallbacks"] == "default"
    assert "<resume>\nresume text\n</resume>" in messages.kwargs["messages"][0]["content"]
    assert "INPUT TYPE: cv" in messages.kwargs["messages"][0]["content"]


async def test_the_prompt_says_what_kind_of_text_it_is_and_lists_the_study_fields():
    w, messages = writer(response(CAREERS))

    await w.careers(resume="resume text", candidate=Candidate(country="Kazakhstan"), source="linkedin")

    user = messages.kwargs["messages"][0]["content"]
    assert "INPUT TYPE: linkedin (the person's LinkedIn profile, saved as PDF)" in user
    assert "Country: Kazakhstan" in user
    system = messages.kwargs["system"]
    assert "- learning: Instructional design and training" in system and "- other:" in system
    assert "{fields}" not in system


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


def test_cited_page_words_are_collected_once_per_page_and_only_from_web_search():
    from bridge.llm.claude import cited_snippets

    cite = lambda url, text, kind="web_search_result_location": SimpleNamespace(  # noqa: E731
        type=kind, url=url, cited_text=text, title="T"
    )
    content = [
        SimpleNamespace(type="server_tool_use"),
        SimpleNamespace(
            type="text", citations=[cite("https://a.example/", "150 000 ₽"), cite("https://a.example/", "150 000 ₽")]
        ),
        SimpleNamespace(
            type="text", citations=[cite("https://a.example/", "до 200 000 ₽"), cite("http://b.example/", "x")]
        ),
        SimpleNamespace(type="text", citations=[cite("https://c.example/", "42", kind="char_location")]),
        SimpleNamespace(type="text", citations=None),
    ]

    snippets = cited_snippets(content)

    assert [(s.url, s.text) for s in snippets] == [("https://a.example/", "150 000 ₽ … до 200 000 ₽")]
