"""The outward-facing panels through HTTP: courses, pay and job openings."""

from __future__ import annotations

ROLE = "Instructional Designer"


def test_study_plan_is_free_only_without_a_budget_and_never_a_search_page(demo):
    free = demo.get("/api/study", params={"role": ROLE, "paid": "false", "hours": 5}).json()
    paid = demo.get("/api/study", params={"role": "Data analyst", "paid": "true", "hours": 5}).json()

    assert free["field"] == "learning" and free["main"]["cost"] != "paid"
    assert all(c["cost"] != "paid" for c in free["more"])
    assert paid["main"]["cost"] == "paid"
    urls = [c["url"] for c in [free["main"], *free["more"], paid["main"], *paid["more"]]]
    assert not any("google.com/search" in u or "youtube.com/results" in u for u in urls)
    assert demo.get("/api/study", params={"role": " "}).status_code == 400


def test_pay_comes_per_role_in_order_and_is_empty_where_we_have_no_official_figure(demo):
    body = demo.get(
        "/api/pay",
        params=[("role", "Data analyst"), ("role", "Product manager"), ("country", "us"), ("location", "Austin, TX")],
    ).json()

    assert body[0]["area"] == "Texas" and body[0]["period"] == "year"
    assert body[1] is None  # no official US occupation for product managers


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
