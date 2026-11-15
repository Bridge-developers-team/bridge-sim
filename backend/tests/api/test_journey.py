"""The whole judge path through HTTP: careers -> roadmap -> practice ->
feedback -> public proof page, plus the guards around each step."""

from __future__ import annotations

import pytest

from bridge.domain.models import Roadmap
from bridge.domain.roadmap import check_roadmap
from bridge.llm.base import LlmError
from tests.samples import DEMO_PERSONA, SAMPLES, TEACHER

ANSWER = (
    "Objective: by the end of this 15-minute module, new warehouse staff will perform a pre-shift dock check "
    "with wheel chocks set, the dock plate locked and green lights, with no missed steps."
)


def walk_to_feedback(client, resume: str = TEACHER.resume):
    careers = client.post("/api/careers", json={"resumeText": resume, "profile": DEMO_PERSONA})
    assert careers.status_code == 200, careers.text
    career = careers.json()["careers"][0]
    plan = client.post("/api/roadmap", json={"career": career, "profile": DEMO_PERSONA})
    assert plan.status_code == 200, plan.text
    task = plan.json()["roadmap"]["weeks"][0]["tasks"][0]
    practice = client.post("/api/practice", json={"career": career, "task": task, "profile": DEMO_PERSONA})
    assert practice.status_code == 200, practice.text
    p = practice.json()
    graded = client.post(
        "/api/practice/evaluate",
        json={"practice": p["practice"], "practiceToken": p["practiceToken"], "answer": ANSWER},
    )
    assert graded.status_code == 200, graded.text
    return p["practice"], graded.json()


def test_demo_mode_walks_the_full_journey_and_publishes_a_proof_page(demo):
    practice, graded = walk_to_feedback(demo)
    assert graded["mode"] == "demo"

    published = demo.post(
        "/api/proofs",
        json={
            "practice": practice,
            "answer": ANSWER,
            "evaluation": graded["evaluation"],
            "mode": graded["mode"],
            "resultToken": graded["resultToken"],
            "reflection": "I learned to name an observable action.",
            "displayName": "Sam",
        },
    )
    assert published.status_code == 201, published.text
    proof_id, key = published.json()["proof"]["id"], published.json()["deleteKey"]

    page = demo.get(f"/api/proofs/{proof_id}")
    assert page.status_code == 200
    assert page.json()["evaluation"] == graded["evaluation"]
    assert page.json()["mode"] == "demo"  # the page stays labeled as sample data

    assert demo.delete(f"/api/proofs/{proof_id}", headers={"X-Delete-Key": "wrong"}).status_code == 404
    assert demo.delete(f"/api/proofs/{proof_id}", headers={"X-Delete-Key": key}).status_code == 204
    assert demo.get(f"/api/proofs/{proof_id}").status_code == 404


@pytest.mark.parametrize("sample", SAMPLES, ids=lambda s: s.id)
def test_every_sample_gets_three_paths_with_real_quotes_and_valid_plans(demo, sample):
    data = demo.post("/api/careers", json={"resumeText": sample.resume}).json()

    assert len(data["careers"]) == 3
    for career in data["careers"]:
        assert career["transferableSkills"], career["title"]
        assert all(s["verified"] for s in career["transferableSkills"]), career["title"]
        for track in ("safe", "balanced", "fast"):
            for hours in (1, 3, 5, 10, 40):
                plan = demo.post("/api/roadmap", json={"career": career, "track": track, "hoursPerWeek": hours})
                assert check_roadmap(Roadmap.model_validate(plan.json()["roadmap"])) == []


def test_live_mode_uses_the_ai_and_sample_flag_does_not(live, fake_ai):
    assert live.post("/api/careers", json={"resumeText": TEACHER.resume}).json()["mode"] == "live"
    assert live.post("/api/careers", json={"resumeText": TEACHER.resume, "sample": True}).json()["mode"] == "sample"

    assert fake_ai.calls == ["careers"]


def test_an_edited_rubric_or_an_edited_score_is_refused(demo):
    practice, graded = walk_to_feedback(demo)
    token = demo.post(
        "/api/practice",
        json={"career": {"id": "x", "title": "Instructional Designer"}, "task": {"id": "t", "title": "T"}},
    ).json()["practiceToken"]

    edited = {**practice, "rubric": [{**c, "maxScore": 5} for c in practice["rubric"]]}
    refused = demo.post("/api/practice/evaluate", json={"practice": edited, "practiceToken": token, "answer": ANSWER})
    assert refused.status_code == 400

    inflated = {**graded["evaluation"], "totalScore": 99}
    publish = demo.post(
        "/api/proofs",
        json={
            "practice": practice,
            "answer": ANSWER,
            "evaluation": inflated,
            "mode": "live",
            "resultToken": graded["resultToken"],
        },
    )
    assert publish.status_code == 400
    assert "changed" in publish.json()["detail"]


@pytest.mark.parametrize(
    ("path", "body", "message"),
    [
        ("/api/careers", {"resumeText": "too short"}, "a bit more"),
        ("/api/careers", {"resumeText": "x " * 8000}, "too long"),
        ("/api/roadmap", {"career": {"id": "x", "title": "   "}}, "Pick a career"),
        ("/api/careers", {"wrong": "shape"}, "incomplete"),
    ],
)
def test_bad_input_gets_a_400_with_a_message_a_person_can_act_on(demo, path, body, message):
    response = demo.post(path, json=body)

    assert response.status_code == 400
    assert message in response.json()["detail"]


def test_feedback_needs_a_real_attempt(demo):
    practice, _ = walk_to_feedback(demo)
    token = demo.post(
        "/api/practice",
        json={"career": {"id": "x", "title": "Instructional Designer"}, "task": {"id": "t", "title": "T"}},
    ).json()["practiceToken"]

    short = demo.post("/api/practice/evaluate", json={"practice": practice, "practiceToken": token, "answer": "ok"})

    assert short.status_code == 400
    assert "15+ words" in short.json()["detail"]


def test_ai_failures_reach_the_user_as_their_message_and_status(live, fake_ai):
    fake_ai.fail_with = LlmError("The AI took too long to answer. Please try again.", 504)

    response = live.post("/api/careers", json={"resumeText": TEACHER.resume})

    assert response.status_code == 504
    assert response.json()["detail"].startswith("The AI took too long")


def test_unexpected_errors_do_not_leak_internals(live, fake_ai):
    fake_ai.fail_with = RuntimeError("database password is hunter2")

    response = live.post("/api/careers", json={"resumeText": TEACHER.resume})

    assert response.status_code == 500
    assert "hunter2" not in response.text


def test_demo_feedback_quotes_the_answer_not_the_sample_label(demo):
    practice = demo.post(
        "/api/practice",
        json={"career": {"id": "x", "title": "Instructional Designer"}, "task": {"id": "t", "title": "T"}},
    ).json()
    sample = demo.post("/api/practice/sample-answer", json={"practice": practice["practice"]}).json()["answer"]

    graded = demo.post(
        "/api/practice/evaluate",
        json={"practice": practice["practice"], "practiceToken": practice["practiceToken"], "answer": sample},
    ).json()

    quotes = {c["evidence"] for c in graded["evaluation"]["criteria"]}
    assert quotes and all(q and not q.startswith("SAMPLE ANSWER") for q in quotes)


@pytest.mark.parametrize("sample", SAMPLES, ids=lambda s: s.id)
def test_tasting_all_three_sample_paths_gives_three_different_tasks(demo, sample):
    careers = demo.post("/api/careers", json={"resumeText": sample.resume}).json()["careers"]

    scenarios = {
        demo.post(
            "/api/practice",
            json={"career": c, "task": {"id": f"taste-{c['id']}", "title": f"A taste of {c['title']} work"}},
        ).json()["practice"]["scenario"]
        for c in careers
    }

    assert len(scenarios) == 3


def test_the_input_type_reaches_the_ai_and_paths_come_back_personal(live, fake_ai):
    body = live.post(
        "/api/careers", json={"resumeText": TEACHER.resume, "profile": DEMO_PERSONA, "source": "linkedin"}
    ).json()

    assert fake_ai.last_source == "linkedin"
    assert "58% to 71%" in body["profile"]["standout"]
    career = body["careers"][0]
    assert career["field"] == "learning" and career["jobTitles"] and career["videoSearches"]
    assert live.post("/api/careers", json={"resumeText": TEACHER.resume, "source": "fax"}).status_code == 400


def test_courses_and_pay_follow_the_field_the_ai_chose(demo):
    music = demo.get("/api/study", params={"role": "Music Teacher", "field": "other"}).json()
    as_data = demo.get("/api/study", params={"role": "Insights Partner", "field": "data"}).json()
    pay = demo.post("/api/pay", json={"roles": ["Insights Partner"], "fields": ["data"], "country": "us"}).json()
    analyst = demo.post("/api/pay", json={"roles": ["Data Analyst"], "country": "us"}).json()

    assert music["field"] == "general" and music["main"] is None
    assert as_data["field"] == "data" and "cs50" in as_data["main"]["id"]
    assert pay[0] is not None and pay[0]["occupation"] == analyst[0]["occupation"]
