"""The outward-facing panels through HTTP: courses, pay and job openings."""

from __future__ import annotations

ROLE = "Instructional Designer"


def test_study_plan_fits_the_budget_and_is_never_a_search_page(demo):
    free = demo.get("/api/study", params={"role": ROLE, "budget": 0, "hours": 5}).json()
    small = demo.get("/api/study", params={"role": "Data analyst", "budget": 20, "currency": "USD"}).json()
    full = demo.get("/api/study", params={"role": "Data analyst", "budget": 100, "currency": "USD"}).json()

    assert free["field"] == "learning" and free["main"]["cost"] != "paid"
    assert all(c["cost"] != "paid" for c in free["more"] + small["more"]) and small["main"]["cost"] == "free"
    assert full["main"]["cost"] == "paid" and full["budgetUsd"] == 100  # $100 covers a $49-a-month certificate
    urls = [c["url"] for c in [free["main"], *free["more"], full["main"], *full["more"]]]
    assert not any("google.com/search" in u or "youtube.com/results" in u for u in urls)
    assert demo.get("/api/study", params={"role": " "}).status_code == 400


def test_web_course_search_is_live_only(demo):
    body = demo.post("/api/study/search", json={"role": ROLE, "budget": 0}).json()

    assert body == {"courses": [], "mode": "demo"}


def test_pay_comes_per_role_in_order_and_official_first(demo):
    body = demo.post(
        "/api/pay",
        json={"roles": ["Data analyst", "Product manager"], "country": "us", "location": "Austin, TX"},
    ).json()

    assert body[0]["area"] == "Texas" and body[0]["kind"] == "official"
    assert body[1] is None  # no official figure, and demo mode has no web search


def test_intro_has_responsibilities_and_a_day(demo):
    body = demo.post("/api/intro", json={"role": ROLE, "currentRole": "Teacher"}).json()

    assert body["mode"] == "demo"
    assert len(body["intro"]["responsibilities"]) >= 3 and len(body["intro"]["day"]) >= 3


def test_cities_follow_the_country(demo):
    kz = demo.get("/api/cities", params={"country": "kz"}).json()
    us = demo.get("/api/cities", params={"country": "us", "q": "aus"}).json()

    assert "Almaty" in kz[:3] and "Austin, TX" in us


def test_linkedin_import_needs_a_profile_link(demo):
    assert demo.post("/api/linkedin", json={"url": "https://example.com/me"}).status_code == 400
    assert demo.post("/api/linkedin", json={"url": "https://www.linkedin.com/in/someone"}).status_code == 503


def test_jobs_without_adzuna_keys_still_give_board_links(demo):
    body = demo.get("/api/jobs", params={"role": ROLE, "city": "Austin, TX", "country": "us"}).json()

    assert body["source"] == "links"
    assert body["listings"] == []
    assert [link["site"] for link in body["links"]] == ["LinkedIn", "LinkedIn: entry level", "Indeed"]
    assert [link["site"] for link in body["people"]] == ["Recruiters on LinkedIn", "Team leads on LinkedIn"]
    assert [link["site"] for link in body["topics"]] == ["LinkedIn posts", "Reddit"]
    assert all(
        link["url"].startswith("https://") and link["hint"] for link in body["links"] + body["people"] + body["topics"]
    )


def test_jobs_with_adzuna_return_listings_once_per_hour_and_fall_back_on_errors(make_client):
    calls: list[tuple[str, dict]] = []

    async def fetch(url, params):
        calls.append((url, params))
        if params["what"] == "Broken":
            raise RuntimeError("adzuna is down")
        return {
            "results": [
                {
                    "title": f"{params['what']} I",
                    "company": {"display_name": "Acme"},
                    "location": {"display_name": params.get("where", "")},
                    "redirect_url": "https://www.adzuna.com/details/1",
                    "created": "2026-11-10T08:00:00Z",
                }
            ]
        }

    client = make_client(adzuna_app_id="id", adzuna_app_key="key", jobs_fetch=fetch)
    query = {"role": ROLE, "city": "Austin, TX", "country": "us"}

    first = client.get("/api/jobs", params=query).json()
    client.get("/api/jobs", params=query)  # served from cache
    broken = client.get("/api/jobs", params={**query, "role": "Broken"}).json()
    elsewhere = client.get("/api/jobs", params={**query, "country": "kz"}).json()  # not an Adzuna country

    assert first["source"] == "adzuna" and first["listings"][0]["company"] == "Acme"
    assert calls[0][0] == "https://api.adzuna.com/v1/api/jobs/us/search/1"
    assert calls[0][1]["where"] == "Austin, TX"
    assert len(calls) == 2  # cached repeat and Kazakhstan made no call
    assert broken["source"] == "links" and broken["links"]
    assert elsewhere["source"] == "links" and elsewhere["country"] == "kz"


def test_job_searches_are_rate_limited_per_visitor(make_client):
    client = make_client(jobs_per_client=1)

    assert client.get("/api/jobs", params={"role": ROLE}).status_code == 200
    assert client.get("/api/jobs", params={"role": ROLE}).status_code == 429
