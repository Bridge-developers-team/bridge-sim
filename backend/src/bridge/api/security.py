"""Security headers on every response.

The Content-Security-Policy allows only this site's own scripts, plus the
one inline script in index.html (it applies the saved theme before first
paint), by its exact hash, computed from the built file at start-up so it
can never drift. Images may also come from YouTube's thumbnail host. The
interactive API docs (/api/docs) load Swagger UI from a CDN, so they get no
CSP. HSTS is sent only over HTTPS (Render terminates TLS in front of us)."""

from __future__ import annotations

import base64
import hashlib
import re
from pathlib import Path

from starlette.types import ASGIApp, Message, Receive, Scope, Send

_INLINE_SCRIPT = re.compile(r"<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>", re.S)


def inline_script_hashes(index_html: Path) -> list[str]:
    """CSP source expressions for each inline <script> in the built page."""
    if not index_html.is_file():
        return []
    html = index_html.read_text(encoding="utf-8")
    return [
        "'sha256-" + base64.b64encode(hashlib.sha256(body.encode("utf-8")).digest()).decode() + "'"
        for body in _INLINE_SCRIPT.findall(html)
    ]


def content_security_policy(script_hashes: list[str]) -> str:
    return "; ".join(
        [
            "default-src 'self'",
            " ".join(["script-src 'self'", *script_hashes]),
            # React sets style attributes (progress bars, segmented controls).
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https://i.ytimg.com",
            "font-src 'self' data:",
            "connect-src 'self'",
            "worker-src 'self' blob:",  # pdf.js reads PDFs in a worker
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'",
        ]
    )


class SecurityHeaders:
    """Pure ASGI middleware (no buffering, so streaming and gzip are unaffected)."""

    def __init__(self, app: ASGIApp, *, csp: str) -> None:
        self.app = app
        self.csp = csp

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        path: str = scope.get("path", "")
        https = scope.get("scheme") == "https"

        async def send_with_headers(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                extra = {
                    b"x-content-type-options": b"nosniff",
                    b"referrer-policy": b"strict-origin-when-cross-origin",
                    b"permissions-policy": b"camera=(), microphone=(), geolocation=(), payment=()",
                    b"x-frame-options": b"DENY",
                    b"cross-origin-opener-policy": b"same-origin",
                }
                if not path.startswith(("/api/docs", "/api/openapi.json")):
                    extra[b"content-security-policy"] = self.csp.encode()
                if https:
                    extra[b"strict-transport-security"] = b"max-age=31536000; includeSubDomains"
                present = {k.lower() for k, _ in headers}
                headers += [(k, v) for k, v in extra.items() if k not in present]
                message["headers"] = headers
            await send(message)

        await self.app(scope, receive, send_with_headers)
