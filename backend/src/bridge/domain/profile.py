"""Form answers -> a clean Candidate. Lists are bounded, numbers clamped, and
the user's own answers always win over what the AI read from the resume."""

from __future__ import annotations

import re
from typing import Any

from bridge.domain.careers import normalize_years
from bridge.domain.models import Candidate
from bridge.domain.roadmap import clamp_hours, normalize_track
from bridge.domain.text import clean

MAX_BUDGET = 10_000_000
# The countries the form offers (frontend lib/options.ts COUNTRIES).
COUNTRY_NAMES = {
    "us": "United States",
    "gb": "United Kingdom",
    "ca": "Canada",
    "au": "Australia",
    "de": "Germany",
    "fr": "France",
    "nl": "Netherlands",
    "in": "India",
    "sg": "Singapore",
    "kz": "Kazakhstan",
}
_CURRENCY = re.compile(r"^[A-Z]{3}$")


def _words(value: object, max_items: int, max_len: int) -> list[str]:
    items = value if isinstance(value, list) else (value.split(",") if isinstance(value, str) else [])
    out = [clean(v, max_len) for v in items]
    return [v for v in out if v][:max_items]


def _budget(value: object) -> int:
    try:
        n = float(str(value))
    except ValueError:
        return 0
    if n != n or n < 0:  # NaN or negative
        return 0
    return int(min(n, MAX_BUDGET) + 0.5)


def read_candidate(raw: dict[str, Any] | None) -> Candidate:
    """Accepts camelCase form answers. Unknown keys, income fields included,
    are ignored on purpose: the server never needs them."""
    p = raw if isinstance(raw, dict) else {}
    currency = clean(p.get("currency"), 3).upper()
    return Candidate(
        current_role=clean(p.get("currentRole"), 120),
        years_experience=normalize_years(p.get("yearsExperience")),
        industry=clean(p.get("industry"), 120),
        change_motivation=_words(p.get("changeMotivation"), 6, 60),
        hours_per_week=clamp_hours(p.get("hoursPerWeek")),
        monthly_learning_budget=_budget(p.get("monthlyLearningBudget")),
        currency=currency if _CURRENCY.match(currency) else "USD",
        location=clean(p.get("location"), 80),
        country=COUNTRY_NAMES.get(clean(p.get("country"), 2).lower(), ""),
        interested_roles=_words(p.get("interestedRoles"), 3, 80),
        transition_preference=normalize_track(p.get("transitionPreference")),
    )
