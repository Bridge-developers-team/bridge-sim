"""Every response carries the security headers; the CSP allows the page's
one inline script by its exact hash and nothing else inline."""

from __future__ import annotations

import base64
import hashlib

from bridge.api.security import content_security_policy, inline_script_hashes

THEME = "\n      try { document.documentElement.classList.add('dark'); } catch (e) {}\n    "


def test_inline_scripts_are_hashed_and_module_scripts_are_not(tmp_path):
    index = tmp_path / "index.html"
    index.write_text(f'<script>{THEME}</script><script type="module" src="/assets/app.js"></script>')
    expected = "'sha256-" + base64.b64encode(hashlib.sha256(THEME.encode()).digest()).decode() + "'"

    assert inline_script_hashes(index) == [expected]
    assert inline_script_hashes(tmp_path / "missing.html") == []
    csp = content_security_policy([expected])
    assert f"script-src 'self' {expected};" in csp and "unsafe-eval" not in csp
    assert "frame-ancestors 'none'" in csp and "https://i.ytimg.com" in csp
    assert "script-src 'self';" in content_security_policy([])


def test_pages_and_api_get_the_headers_and_the_docs_keep_working(make_client, tmp_path):
    static = tmp_path / "dist"
    (static / "assets").mkdir(parents=True)
    (static / "index.html").write_text(f'<div id="root"></div><script>{THEME}</script>')
    client = make_client(static_dir=static)

    page = client.get("/p/some-proof")
    api = client.get("/api/config")
    docs = client.get("/api/docs")

    for r in (page, api):
        assert r.headers["x-content-type-options"] == "nosniff"
        assert r.headers["referrer-policy"] == "strict-origin-when-cross-origin"
        assert "frame-ancestors 'none'" in r.headers["content-security-policy"]
    assert "sha256-" in page.headers["content-security-policy"]
    assert "content-security-policy" not in docs.headers  # Swagger UI loads from a CDN
    assert "strict-transport-security" not in page.headers  # plain http in tests: HSTS only over https
