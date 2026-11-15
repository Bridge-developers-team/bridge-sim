"""Link previews. Chat apps and social sites read a page's meta tags without
running JavaScript, so the server writes them into index.html: the same
title and description everywhere, and for a proof page (/p/<id>) the
person's role and score, so a shared work sample previews as one."""

from __future__ import annotations

from dataclasses import dataclass
from html import escape

from bridge.domain.models import Proof

DEFAULT_TITLE = "Bridge: change careers without starting over"
DEFAULT_DESCRIPTION = (
    "Turn your experience into three realistic career paths, a 30-day plan that fits your week, "
    "and graded proof of your work."
)


@dataclass(frozen=True)
class PageMeta:
    title: str
    description: str


def proof_meta(proof: Proof) -> PageMeta:
    name = proof.display_name.strip() or "A career changer"
    role = proof.practice.target_role
    score = f"{proof.evaluation.total_score} of {proof.evaluation.max_total}"
    sample = " (sample data)" if proof.mode != "live" else ""
    return PageMeta(
        title=f"{name}'s practice task: {role} | Bridge",
        description=(
            f"A graded 10-minute work sample for a {role} role: {score} on a rubric shown before writing{sample}. "
            "See the brief, the answer and the feedback."
        ),
    )


def render(template: str, meta: PageMeta, base_url: str, path: str) -> str:
    """index.html with the page's title and preview tags. Every value is
    HTML-escaped: a display name is user input."""
    base = base_url.rstrip("/")
    url = f"{base}/{path.lstrip('/')}" if path else f"{base}/"
    tags = {
        "og:type": "website",
        "og:site_name": "Bridge",
        "og:title": meta.title,
        "og:description": meta.description,
        "og:url": url,
        "og:image": f"{base}/og.png",
        "og:image:width": "1200",
        "og:image:height": "630",
        "og:image:alt": "Bridge: change careers without starting over",
    }
    twitter = {
        "twitter:card": "summary_large_image",
        "twitter:title": meta.title,
        "twitter:description": meta.description,
        "twitter:image": f"{base}/og.png",
    }
    lines = [f'<meta property="{k}" content="{escape(v, quote=True)}" />' for k, v in tags.items()]
    lines += [f'<meta name="{k}" content="{escape(v, quote=True)}" />' for k, v in twitter.items()]
    html = template
    start, end = html.find("<title>"), html.find("</title>")
    if start != -1 and end != -1:
        html = html[:start] + f"<title>{escape(meta.title)}</title>" + html[end + len("</title>") :]
    return html.replace("</head>", "    " + "\n    ".join(lines) + "\n  </head>", 1)
