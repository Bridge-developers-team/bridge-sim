"""The two outward-facing panels through HTTP: learning links and job openings."""

from __future__ import annotations

ROLE = "Instructional Designer"


def test_demo_mode_returns_labeled_search_links_not_invented_pages(demo):
    response = demo.post("/api/resources", json={"role": ROLE, "topic": "Storyboarding modules"})

    assert response.status_code == 200
    body = response.json()
    assert body["mode"] == "demo"
    assert {r["kind"] for r in body["resources"]} == {"search"}


def test_resources_need_a_role_and_a_topic(demo):
    assert demo.post("/api/resources", json={"role": ROLE, "topic": "  "}).status_code == 400


def test_jobs_without_adzuna_keys_still_give_board_links(demo):
    body = demo.get("/api/jobs", params={"role": ROLE, "city": "Austin, TX", "country": "us"}).json()

    assert body["source"] == "links"
    assert body["listings"] == []
    assert [link["site"] for link in body["links"]] == ["LinkedIn", "LinkedIn: entry level", "Indeed", "Google Jobs"]
    assert [link["site"] for link in body["people"]] == [
        "Recruiters on LinkedIn",
        "Team leads on LinkedIn",
        "Recruiters via Google",
    ]
    assert [link["site"] for link in body["topics"]] == ["LinkedIn posts", "News", "Reddit"]
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
