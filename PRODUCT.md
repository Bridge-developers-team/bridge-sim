# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Career changers:** working adults, roughly 25–45, who have wanted to change careers for at least a year but do not know which profession to move into. They usually cannot stop working, often have financial commitments, lack a network in the target field, and feel overwhelmed by generic career advice.
- **Recent graduates:** unemployed or underemployed graduates who cannot find work in their field, or want to point their degree somewhere new.

Their job: find out what they can realistically become, which existing skills already count, what is missing, and what to do this week.

## Product Purpose

Bridge is an AI career-transition navigator. It turns a CV and real-life constraints (free hours per week, learning budget, pace) into three realistic career paths, a side-by-side comparison, and an interactive 30-day roadmap of weekly tasks that fit the person's time, starting with a 10-minute practice task done inside the app. Success: within about 10 minutes a person picks a direction, understands their gaps, and completes their first concrete action; their progress is there when they come back.

## Positioning

Other tools suggest careers, list courses, or simulate jobs. Bridge connects discovery, skill transfer, real constraints, weekly actions, and proof-of-work in one flow: every "skill you already have" is backed by a quote from the person's own CV that code checks, every week fits the hours they said they have, and practice work becomes a case study they own.

## Operating Context

Used at home in spare time, often in the evening, on laptop or phone, by someone still holding a job or job-hunting. Sessions are short and repeated across weeks; the roadmap is reopened to tick tasks and see the next step. Tasks can be scheduled into Google Calendar. Built for a hackathon pitch demo (Business Cup 2.0, Nov 2026) with a fictitious teacher persona.

## Capabilities and Constraints

- Flow: landing → CV upload → constraints (all tap-to-choose) → 3 career paths + comparison → 30-day roadmap → practice task with rubric feedback → case study export (Markdown, print/PDF).
- Plain HTML/CSS/JS front end served by Node + Express; no build step. Claude Sonnet 5.5 and Haiku 5.5 via the Anthropic API; a labeled demo mode without a key.
- Progress lives in the browser (localStorage). The CV text and income figures are never stored. No accounts, no public share links.
- Never invents salaries, course prices, job listings, hiring dates, success probabilities, or external links. Effort is qualitative (lower / medium / higher).

## Brand Commitments

- Name: **Bridge**. Tagline: "Your next career, without starting over."
- Microcopy from the team brief: "You're not starting from zero.", "Here's what your experience already gives you.", "Your next 10-minute step.", "A roadmap, not a promise."

## Evidence on Hand

- Fictitious sample CVs in `data/samples.js` (teacher, nurse, retail manager, three graduates), labeled as samples.
- Market research with sources in `docs/research-graduates.md`.
- No testimonials, customers, pricing validation, or outcome data exist; none may be invented.

## Product Principles

1. Show what to do next before showing anything else.
2. Prove, don't claim: evidence from the user's own words, checks done in code.
3. Fit real life: the plan bends to the person's hours, budget and pace, never the reverse.
4. Honest uncertainty: AI output is labeled, unknowns stay unknown.
5. The person owns their work and data.

## Accessibility & Inclusion

Readable contrast, keyboard operation, visible focus, reduced-motion support, and phone widths down to 390px without horizontal scrolling.
