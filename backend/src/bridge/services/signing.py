"""HMAC tokens for things the browser holds and later sends back.

A practice task is signed when it is created, so the rubric cannot be edited
before grading. A graded result is signed after grading, so a proof page can
only show scores the server really gave. Nothing is stored until the user
publishes; the token is the receipt."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
from typing import Any


def canonical(data: Any) -> bytes:
    return json.dumps(data, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()


class Signer:
    def __init__(self, secret: str) -> None:
        if len(secret) < 16:
            raise ValueError("SECRET_KEY must be at least 16 characters.")
        self._key = secret.encode()

    def sign(self, kind: str, data: Any) -> str:
        digest = hmac.new(self._key, kind.encode() + b"\n" + canonical(data), hashlib.sha256).digest()
        return base64.urlsafe_b64encode(digest).rstrip(b"=").decode()

    def verify(self, kind: str, data: Any, token: str) -> bool:
        return hmac.compare_digest(self.sign(kind, data), token or "")
