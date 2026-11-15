"""Spend protection, health check and serving the built front end."""

from __future__ import annotations

from bridge.services.limits import DailyBudget, SlidingWindow
from tests.samples import TEACHER


def test_per_client_limit_is_per_real_ip_behind_the_proxy(make_client, fake_ai):
    client = make_client(writer=fake_ai, ai_calls_per_client=2)
    body = {"resumeText": TEACHER.resume}

    statuses = [client.post("/api/careers", json=body).status_code for _ in range(3)]

    assert statuses == [200, 200, 429]
    assert fake_ai.calls == ["careers", "careers"]  # the refused call cost nothing


def test_daily_budget_caps_all_live_calls_but_sample_data_still_works(make_client, fake_ai):
    client = make_client(writer=fake_ai, ai_calls_per_day=1)
    body = {"resumeText": TEACHER.resume}

    assert client.post("/api/careers", json=body).status_code == 200
    capped = client.post("/api/careers", json=body)
    assert capped.status_code == 503
    assert "sample data" in capped.json()["detail"]
    assert client.post("/api/careers", json={**body, "sample": True}).status_code == 200


def test_sliding_window_forgets_old_hits_and_idle_clients():
    now = [0.0]
    window = SlidingWindow(limit=1, window_seconds=10, clock=lambda: now[0])

    assert window.allow("a") and not window.allow("a")
    now[0] = 10.0
    assert window.allow("a")
    for i in range(600):  # trigger the periodic sweep
        window.allow(f"client-{i}")
    now[0] = 100.0
    window.allow("b")
    window._sweep(now[0])
    assert len(window) == 1


def test_daily_budget_resets_on_a_new_day():
    day = ["2026-11-15"]
    budget = DailyBudget(limit=1, today=lambda: day[0])

    assert budget.take() and not budget.take()
    day[0] = "2026-11-16"
    assert budget.take()


def test_health_check_reports_mode_and_the_running_commit(demo, live, make_client):
    assert demo.get("/healthz").json() == {"ok": True, "mode": "demo", "commit": "local"}
    assert live.get("/healthz").json()["mode"] == "live"
    deployed = make_client(render_git_commit="f2dd44408929d7254c5fd9fdd682fb4899d7f132")
    assert deployed.get("/healthz").json()["commit"] == "f2dd444"


def test_config_lists_samples_tracks_and_limits(demo):
    config = demo.get("/api/config").json()

    assert config["mode"] == "demo"
    assert [s["id"] for s in config["samples"]] == ["teacher", "nurse", "retail"]
    assert {t["id"] for t in config["tracks"]} == {"safe", "balanced", "fast"}
    assert config["limits"]["maxResume"] == 15_000


def test_front_end_routes_get_index_html_and_assets_are_cached_forever(make_client, tmp_path):
    dist = tmp_path / "dist"
    (dist / "assets").mkdir(parents=True)
    (dist / "index.html").write_text("<!doctype html><title>Bridge</title>")
    (dist / "assets" / "app-abc123.js").write_text("console.log(1)")
    (dist / "favicon.svg").write_text("<svg/>")
    client = make_client(static_dir=dist)

    deep_link = client.get("/p/some-proof-id")
    assert deep_link.status_code == 200 and "Bridge" in deep_link.text
    assert deep_link.headers["cache-control"] == "no-cache"
    asset = client.get("/assets/app-abc123.js")
    assert "immutable" in asset.headers["cache-control"]
    assert client.get("/favicon.svg").status_code == 200
    assert client.get("/api/nope").status_code == 404
    assert client.get("/../../etc/passwd").status_code in (200, 404)  # never a file outside dist
    assert "root:" not in client.get("/../../etc/passwd").text
