"""Quote checks. The AI must quote the user's own text; a claim without a real
quote is labeled (career skills) or capped (practice scores)."""

from __future__ import annotations

import re

_SPACE = re.compile(r"\s+")
_EDGE = re.compile(r"^[\s\"'.,;:!?…-]+|[\s\"'.,;:!?…-]+$")
MIN_QUOTE_WORDS = 3


def normalize(text: object) -> str:
    """Lower case, straight quotes and hyphens, single spaces."""
    s = str(text or "").lower()
    s = re.sub(r"[‘’‛]", "'", s)
    s = re.sub(r"[“”‟]", '"', s)
    s = re.sub(r"[–—]", "-", s)
    return _SPACE.sub(" ", s).strip()


def verify_evidence(source: str, quote: str) -> bool:
    """True when `quote` (at least 3 words) appears verbatim in `source`,
    ignoring case, whitespace, smart quotes and punctuation at its edges."""
    q = _EDGE.sub("", normalize(quote))
    if len(q.split()) < MIN_QUOTE_WORDS:
        return False
    return q in normalize(source)
