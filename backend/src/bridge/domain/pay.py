"""Typical pay for a target role where the user lives, from official
statistics only. Nothing here is estimated by us or by the AI: every number
is copied from a public table, and the UI shows its source, year and the
official occupation name it belongs to (often the closest match, not an
exact one).

- United States: BLS Occupational Employment and Wage Statistics (OEWS),
  May 2025, annual median wage, national and for the states of the cities
  in the start form.
- Kazakhstan: Bureau of National Statistics, "Distribution of wages of
  workers by main professions and positions" (2026, published 03.11.2026),
  average monthly nominal wage. The survey gives a figure per industry, so
  the UI shows the range across the industries most career changers join.
Everywhere else (and for jobs with no official figure): an approximate
figure the AI found with web search, kept only when it names one of the
real search results as its source. It is labeled as an estimate, with the
source linked."""

from __future__ import annotations

import re
from typing import Literal

from bridge.domain.drafts import PayEstimateDraft
from bridge.domain.learning import match_field
from bridge.domain.models import CamelModel
from bridge.domain.text import clean
from bridge.domain.web import Found, host

US_SOURCE = "U.S. Bureau of Labor Statistics, OEWS, May 2025"
KZ_SOURCE = "Bureau of National Statistics of Kazakhstan, wages by profession, 2026"
KZ_URL = "https://stat.gov.kz/en/industries/labor-and-income/stat-wags/"

# Field (see learning.FIELDS) -> official US occupation (SOC code).
US_SOC = {
    "data": "15-2051",
    "health-data": "29-9021",
    "software": "15-1252",
    "web": "15-1254",
    "qa": "15-1253",
    "ux": "15-1255",
    "it-support": "15-1232",
    "security": "15-1212",
    "project": "13-1082",
    "business": "13-1111",
    "marketing": "13-1161",
    "learning": "13-1151",
    "hr": "13-1071",
    "sales": "41-3091",
    "finance": "13-2051",
    "writing": "27-3042",
    "content": "27-3043",
}
KZ_FIELD = {"content": "writing"}  # fields that share another field's KZ figure

STATE_NAMES = {
    "AZ": "Arizona",
    "CA": "California",
    "CO": "Colorado",
    "DC": "Washington, DC",
    "FL": "Florida",
    "GA": "Georgia",
    "IL": "Illinois",
    "MA": "Massachusetts",
    "MI": "Michigan",
    "MN": "Minnesota",
    "NV": "Nevada",
    "NY": "New York",
    "NC": "North Carolina",
    "OH": "Ohio",
    "OR": "Oregon",
    "PA": "Pennsylvania",
    "TN": "Tennessee",
    "TX": "Texas",
    "UT": "Utah",
    "WA": "Washington",
}

# BLS OEWS, May 2025 : annual median wage by state (US = national).
US_MEDIANS: dict[str, dict[str, int | None]] = {
    "15-2051": {
        "US": 120230,
        "AZ": 107240,
        "CA": 141590,
        "CO": 117400,
        "DC": 126490,
        "FL": 115820,
        "GA": 104340,
        "IL": 106560,
        "MA": 131750,
        "MI": 100590,
        "MN": 128800,
        "NC": 119090,
        "NV": 98540,
        "NY": 130460,
        "OH": 102630,
        "OR": 125990,
        "PA": 106850,
        "TN": 100330,
        "TX": 122090,
        "UT": 108090,
        "WA": 163350,
    },
    "29-9021": {
        "US": 68020,
        "AZ": 50740,
        "CA": 90750,
        "CO": 78470,
        "DC": 75460,
        "FL": 76950,
        "GA": 70170,
        "IL": 62780,
        "MA": 81420,
        "MI": 67150,
        "MN": 90760,
        "NC": 63010,
        "NV": 63610,
        "NY": 75320,
        "OH": 71330,
        "OR": 86230,
        "PA": 59980,
        "TN": 64560,
        "TX": 76820,
        "UT": 75320,
        "WA": 59640,
    },
    "15-1252": {
        "US": 135980,
        "AZ": 129690,
        "CA": 174410,
        "CO": 138390,
        "DC": 136880,
        "FL": 130980,
        "GA": 131010,
        "IL": 132110,
        "MA": 165210,
        "MI": 125570,
        "MN": 130050,
        "NC": 134710,
        "NV": 128810,
        "NY": 166180,
        "OH": 114090,
        "OR": 142720,
        "PA": 126550,
        "TN": 122430,
        "TX": 132150,
        "UT": 128810,
        "WA": 166540,
    },
    "15-1254": {
        "US": 92650,
        "AZ": 76230,
        "CA": 119570,
        "CO": 85950,
        "DC": 114690,
        "GA": 90340,
        "IL": 84820,
        "MA": 98470,
        "MI": 98470,
        "MN": 101020,
        "NC": 96610,
        "NV": 83220,
        "NY": 98580,
        "OH": None,
        "OR": 64460,
        "PA": 86380,
        "TN": 74760,
        "TX": 85800,
        "UT": 100170,
        "WA": 130440,
    },
    "15-1253": {
        "US": 104300,
        "AZ": 100650,
        "CA": 128740,
        "CO": 123690,
        "DC": 103340,
        "FL": 100210,
        "GA": 103040,
        "IL": 104910,
        "MA": 122210,
        "MI": 98720,
        "MN": 101700,
        "NC": 100390,
        "NV": None,
        "NY": 121240,
        "OH": 98000,
        "OR": 108440,
        "PA": 93030,
        "TN": 91040,
        "TX": 101850,
        "UT": 82100,
        "WA": 128480,
    },
    "15-1255": {
        "US": 104000,
        "AZ": 98070,
        "CA": 136110,
        "CO": 95880,
        "DC": 107650,
        "FL": 77730,
        "GA": 103810,
        "IL": 85710,
        "MA": 113540,
        "MI": 81010,
        "MN": 82650,
        "NC": 97990,
        "NV": 80120,
        "NY": 120990,
        "OH": 83360,
        "OR": 102220,
        "PA": 104160,
        "TN": 63510,
        "TX": 102650,
        "UT": 99990,
        "WA": 130480,
    },
    "15-1232": {
        "US": 61860,
        "AZ": 61410,
        "CA": 79570,
        "CO": 71900,
        "DC": 80950,
        "FL": 58740,
        "GA": 60440,
        "IL": 59860,
        "MA": 75070,
        "MI": 56240,
        "MN": 63630,
        "NC": 60120,
        "NV": 57870,
        "NY": 72560,
        "OH": 59720,
        "OR": 62840,
        "PA": 58670,
        "TN": 55990,
        "TX": 59490,
        "UT": 61110,
        "WA": 75220,
    },
    "15-1212": {
        "US": 129180,
        "AZ": 125260,
        "CA": 138570,
        "CO": 135220,
        "DC": 135090,
        "FL": 124860,
        "GA": 128970,
        "IL": 124180,
        "MA": 136550,
        "MI": 106230,
        "MN": 130710,
        "NC": 131540,
        "NV": 106200,
        "NY": 134660,
        "OH": 110480,
        "OR": None,
        "PA": 117770,
        "TN": 115430,
        "TX": 129890,
        "UT": 99690,
        "WA": 154940,
    },
    "13-1082": {
        "US": 102320,
        "AZ": 99050,
        "CA": 120910,
        "CO": 110050,
        "DC": 104900,
        "FL": 98070,
        "GA": 102140,
        "IL": 103470,
        "MA": 114190,
        "MI": 100970,
        "MN": 97860,
        "NC": 100820,
        "NV": 99940,
        "NY": 121040,
        "OH": 95770,
        "OR": 105480,
        "PA": 100150,
        "TN": 85890,
        "TX": 98440,
        "UT": 96720,
        "WA": 124160,
    },
    "13-1111": {
        "US": 101860,
        "AZ": 93310,
        "CA": 101460,
        "CO": 104750,
        "DC": 126140,
        "FL": 88610,
        "GA": 99600,
        "IL": 104270,
        "MA": 134720,
        "MI": 93640,
        "MN": 100790,
        "NC": 98560,
        "NV": 81600,
        "NY": 112250,
        "OH": 94270,
        "OR": 101840,
        "PA": 93830,
        "TN": 99260,
        "TX": 101400,
        "UT": 83530,
        "WA": 109170,
    },
    "13-1161": {
        "US": 78760,
        "AZ": 71940,
        "CA": 94700,
        "CO": 93050,
        "DC": 98090,
        "FL": 75450,
        "GA": 75850,
        "IL": 79120,
        "MA": 101810,
        "MI": 66780,
        "MN": 87510,
        "NC": 78410,
        "NV": 71840,
        "NY": 98580,
        "OH": 72790,
        "OR": 79150,
        "PA": 68760,
        "TN": 69790,
        "TX": 72520,
        "UT": 62630,
        "WA": 95120,
    },
    "13-1151": {
        "US": 69280,
        "AZ": 67140,
        "CA": 75790,
        "CO": 75790,
        "DC": 80980,
        "FL": 71990,
        "GA": 67320,
        "IL": 67380,
        "MA": 80270,
        "MI": 64350,
        "MN": 76710,
        "NC": 65250,
        "NV": 61350,
        "NY": 76080,
        "OH": 64780,
        "OR": 76360,
        "PA": 71350,
        "TN": 62280,
        "TX": 62860,
        "UT": 60900,
        "WA": 81860,
    },
    "13-1071": {
        "US": 75940,
        "AZ": 71390,
        "CA": 83500,
        "CO": 80840,
        "DC": 110970,
        "FL": 66410,
        "GA": 70570,
        "IL": 76820,
        "MA": 85630,
        "MI": 69520,
        "MN": 78760,
        "NC": 73070,
        "NV": 71610,
        "NY": 84380,
        "OH": 70180,
        "OR": 78060,
        "PA": 70450,
        "TN": 67370,
        "TX": 68920,
        "UT": 71750,
        "WA": 84550,
    },
    "41-3091": {
        "US": 69990,
        "AZ": 72920,
        "CA": 80850,
        "CO": 79810,
        "DC": 76770,
        "FL": 60660,
        "GA": 75280,
        "IL": 66900,
        "MA": 83760,
        "MI": 73380,
        "MN": 75370,
        "NC": 62620,
        "NV": 62450,
        "NY": 92190,
        "OH": 59390,
        "OR": 67040,
        "PA": 64480,
        "TN": 60230,
        "TX": 61680,
        "UT": 62580,
        "WA": 79920,
    },
    "13-2051": {
        "US": 102740,
        "AZ": 93540,
        "CA": 109110,
        "CO": 103850,
        "DC": 105780,
        "FL": 94490,
        "GA": 99420,
        "IL": 101180,
        "MA": 111040,
        "MI": 95420,
        "MN": 102990,
        "NC": 102390,
        "NV": 83430,
        "NY": 127930,
        "OH": 94280,
        "OR": 120590,
        "PA": 84460,
        "TN": 92990,
        "TX": 99150,
        "UT": 91370,
        "WA": 107210,
    },
    "27-3042": {
        "US": 90390,
        "AZ": 79780,
        "CA": 104000,
        "CO": 100610,
        "DC": 117810,
        "FL": 86240,
        "GA": 73070,
        "IL": 88700,
        "MA": 109200,
        "MI": 85270,
        "MN": 83270,
        "NC": 86320,
        "NV": 88750,
        "NY": 98310,
        "OH": 76480,
        "OR": 84000,
        "PA": 87620,
        "TN": 79550,
        "TX": 82750,
        "UT": 80270,
        "WA": 104070,
    },
    "27-3043": {
        "US": 76910,
        "AZ": 55990,
        "CA": 86480,
        "CO": 76830,
        "DC": 129300,
        "FL": 68080,
        "GA": 74710,
        "IL": 68220,
        "MA": 85260,
        "MN": 72810,
        "NC": 63660,
        "NV": 63910,
        "NY": None,
        "OH": 65930,
        "OR": 80540,
        "PA": 77410,
        "TN": 58870,
        "TX": 69990,
        "UT": 64530,
        "WA": 85700,
    },
}
US_TITLES = {
    "15-2051": "Data scientists",
    "29-9021": "Health information technologists and medical registrars",
    "15-1252": "Software developers",
    "15-1254": "Web developers",
    "15-1253": "Software quality assurance analysts and testers",
    "15-1255": "Web and digital interface designers",
    "15-1232": "Computer user support specialists",
    "15-1212": "Information security analysts",
    "13-1082": "Project management specialists",
    "13-1111": "Management analysts",
    "13-1161": "Market research analysts and marketing specialists",
    "13-1151": "Training and development specialists",
    "13-1071": "Human resources specialists",
    "41-3091": "Sales representatives of services",
    "13-2051": "Financial and investment analysts",
    "27-3042": "Technical writers",
    "27-3043": "Writers and authors",
}
KZ_AVERAGES: dict[str, tuple[str, dict[str, int]]] = {
    "data": (
        "Analyst",
        {
            "Information and communication": 935831,
            "Financial and insurance activities": 1467035,
            "Professional, scientific and technical activities": 873406,
        },
    ),
    "health-data": ("Statistician-analyst", {"Healthcare and social services": 434000}),
    "software": (
        "Software Developer",
        {
            "Information and communication": 1948731,
            "Financial and insurance activities": 1615260,
            "Professional, scientific and technical activities": 725667,
        },
    ),
    "web": (
        "Web developer",
        {
            "Information and communication": 1399021,
            "Financial and insurance activities": 1229168,
            "Professional, scientific and technical activities": 855000,
        },
    ),
    "qa": (
        "Application Testing Specialist",
        {"Information and communication": 1063132, "Financial and insurance activities": 1206587},
    ),
    "ux": (
        "Website designer",
        {
            "Information and communication": 552423,
            "Financial and insurance activities": 2313870,
            "Administrative and support services activities": 602800,
        },
    ),
    "it-support": (
        "Software Product Support Specialist",
        {
            "Information and communication": 999805,
            "Financial and insurance activities": 735189,
            "Administrative and support services activities": 591337,
        },
    ),
    "security": (
        "Information Security Specialist",
        {
            "Information and communication": 876769,
            "Financial and insurance activities": 943479,
            "Professional, scientific and technical activities": 755735,
        },
    ),
    "project": (
        "Project Manager in the field of information technology",
        {
            "Information and communication": 1701663,
            "Financial and insurance activities": 2436185,
            "Administrative and support services activities": 1325900,
        },
    ),
    "product": (
        "Project Manager for Development (New Products)",
        {
            "Information and communication": 1481825,
            "Financial and insurance activities": 2472907,
            "Professional, scientific and technical activities": 1417115,
        },
    ),
    "business": (
        "Business analyst",
        {
            "Information and communication": 699815,
            "Financial and insurance activities": 1098497,
            "Professional, scientific and technical activities": 1806407,
        },
    ),
    "marketing": (
        "Marketer",
        {
            "Information and communication": 881053,
            "Financial and insurance activities": 1264128,
            "Professional, scientific and technical activities": 1041546,
        },
    ),
    "learning": ("Trainer (trainings, retraining and advanced training)", {"Education": 543560}),
    "hr": (
        "HR Specialist",
        {
            "Information and communication": 553426,
            "Financial and insurance activities": 628166,
            "Professional, scientific and technical activities": 343194,
        },
    ),
    "sales": (
        "Sales Manager for Information Technology Products and Solutions",
        {
            "Information and communication": 767778,
            "Financial and insurance activities": 606770,
            "Professional, scientific and technical activities": 595331,
        },
    ),
    "finance": (
        "Financial analyst",
        {
            "Information and communication": 815464,
            "Financial and insurance activities": 975890,
            "Professional, scientific and technical activities": 1117478,
        },
    ),
    "writing": (
        "Editor (general profile)",
        {
            "Information and communication": 485795,
            "Professional, scientific and technical activities": 436700,
            "Education": 471172,
        },
    ),
}


class Pay(CamelModel):
    role: str
    occupation: str  # the official occupation the number belongs to
    area: str  # "Texas", "United States", "Kazakhstan"
    currency: str
    period: Literal["year", "month"]
    stat: Literal["median", "average", "estimate"]
    low: int
    high: int  # equal to low for a single figure
    note: str = ""  # e.g. "Range across 3 industries"
    source: str
    url: str
    kind: Literal["official", "estimate"] = "official"


_STATE = re.compile(r",\s*([A-Z]{2})\b")


def us_state(location: str) -> str | None:
    """'Austin, TX' -> 'TX' when we have that state's figures."""
    m = _STATE.search(clean(location, 120))
    return m.group(1) if m and m.group(1) in STATE_NAMES else None


def pay_for(role: str, country: str, location: str = "") -> Pay | None:
    field = match_field(role).id
    if country == "us" and field in US_SOC:
        soc = US_SOC[field]
        medians = US_MEDIANS.get(soc, {})
        state = us_state(location)
        area, value = ("US", medians.get("US"))
        if state and medians.get(state):
            area, value = state, medians[state]
        if not value:
            return None
        return Pay(
            role=clean(role, 80),
            occupation=US_TITLES[soc],
            area=STATE_NAMES.get(area, "United States"),
            currency="USD",
            period="year",
            stat="median",
            low=value,
            high=value,
            note="" if area != "US" or not state else "No state figure for this job; national median.",
            source=US_SOURCE,
            url=f"https://www.bls.gov/oes/current/oes{soc.replace('-', '')}.htm",
        )
    if country == "kz":
        entry = KZ_AVERAGES.get(KZ_FIELD.get(field, field))
        if not entry:
            return None
        occupation, by_industry = entry
        values = sorted(by_industry.values())
        return Pay(
            role=clean(role, 80),
            occupation=occupation,
            area="Kazakhstan",
            currency="KZT",
            period="month",
            stat="average",
            low=values[0],
            high=values[-1],
            note=(
                f"Range across {len(values)} industries: {', '.join(by_industry)}."
                if len(values) > 1
                else f"In {next(iter(by_industry))}."
            ),
            source=KZ_SOURCE,
            url=KZ_URL,
        )
    return None


_CURRENCY = re.compile(r"^[A-Z]{3}$")


def estimate_from_draft(role: str, area: str, draft: PayEstimateDraft, found: list[Found]) -> Pay | None:
    """An AI-read pay figure, kept only if it cites a real search result and
    the numbers make sense. The source title and link are the result's own."""
    if not draft.found or not 0 <= draft.source < len(found):
        return None
    low, high = sorted((int(draft.low), int(draft.high)))
    currency = clean(draft.currency, 3).upper()
    if low <= 0 or high > low * 10 or not _CURRENCY.match(currency):
        return None
    r = found[draft.source]
    return Pay(
        role=clean(role, 80),
        occupation=clean(role, 80),
        area=clean(area, 80),
        currency=currency,
        period="month" if draft.period.strip().lower().startswith("month") else "year",
        stat="estimate",
        low=low,
        high=high,
        note=clean(draft.note, 120),
        source=f"{r.title} ({host(r.url)})",
        url=r.url,
        kind="estimate",
    )
