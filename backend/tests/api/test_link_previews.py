"""Shared links preview well: every page carries Open Graph tags with
absolute URLs, and a proof page names the person, the role and the score,
escaped (a display name is user input)."""

from __future__ import annotations

from tests.api.test_journey import ANSWER, walk_to_feedback


def _site(tmp_path):
    static = tmp_path / "dist"
    (static / "assets").mkdir(parents=True)
    (static / "index.html").write_text(
        "<!doctype html><html><head><title>Bridge: change careers without starting over</title></head>"
        '<body><div id="root"></div></body></html>'
    )
    (static / "og.png").write_bytes(b"\x89PNG")
    return static


def test_every_page_has_preview_tags_with_absolute_urls(make_client, tmp_path):
    client = make_client(static_dir=_site(tmp_path))

    html = client.get("/start").text

    assert '<meta property="og:title" content="Bridge: change careers without starting over" />' in html
    assert '<meta property="og:image" content="http://testserver/og.png" />' in html
    assert '<meta property="og:url" content="http://testserver/start" />' in html
    assert '<meta name="twitter:card" content="summary_large_image" />' in html
    assert client.get("/og.png").status_code == 200


def test_a_proof_link_previews_with_name_role_and_score_escaped(make_client, tmp_path):
    client = make_client(static_dir=_site(tmp_path))
    practice, graded = walk_to_feedback(client)
    published = client.post(
        "/api/proofs",
        json={
            "practice": practice,
            "answer": ANSWER,
            "evaluation": graded["evaluation"],
            "mode": graded["mode"],
            "resultToken": graded["resultToken"],
            "displayName": 'Sam <script>alert("x")</script>',
        },
    ).json()

    html = client.get(f"/p/{published['proof']['id']}").text
    missing = client.get("/p/no-such-proof")

    role, ev = practice["targetRole"], graded["evaluation"]
    assert (
        f"<title>Sam &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;&#x27;s practice task: {role} | Bridge</title>"
        in html
    )
    assert "<script>alert" not in html
    assert f"{ev['totalScore']} of {ev['maxTotal']}" in html and "(sample data)" in html
    assert missing.status_code == 200 and "Bridge: change careers without starting over" in missing.text
