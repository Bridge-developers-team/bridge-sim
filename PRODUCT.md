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

- Flow: landing → CV upload (PDF first; or a public LinkedIn profile link, or pasted text) + constraints → 3 career paths with pay → meet each job (illustrated slides: what it is, responsibilities, a typical day, tools, good and hard parts, pay, how to start) → 30-day roadmap → practice task with rubric feedback → public proof page (published only on request, deletable). The 10-minute task is optional, offered after meeting a job.
- React + TypeScript front end (Vite) served by a FastAPI (Python) backend. Claude Sonnet 5.5 and Haiku 5.5 via the Anthropic API; a labeled demo mode without a key.
- Progress lives in the browser (localStorage). The CV text and income figures are never stored. No accounts. The only stored data is a proof page the user chose to publish.
- Never invents salaries, course prices, job listings, hiring dates, success probabilities, or external links. Effort is qualitative (lower / medium / higher).
- Courses: a hand-checked catalog (`backend/src/bridge/domain/learning.py`) for 17 fields, each course with the provider's own syllabus, plus courses, lectures and guides the live AI finds on course sites for the exact role (links are search results it picks by number, never search pages). The budget is a number in any currency, converted to US dollars: 0 means free material only; a paid Coursera certificate ($49 a month, US price) appears only when the budget covers it.
- Typical pay: official tables first (BLS OEWS May 2025 medians for the US by state; Kazakhstan's 2026 wages-by-profession survey), else an approximate figure the live AI read from a cited web page for that city or country, labeled "estimate" with the page linked. When nothing is found, the card says so.
- Location: every country (GeoNames) with its currency, and the cities of the chosen country (GeoNames, 15,000+ people). Job titles: thousands of real reported titles (O*NET).
- The plan helps people follow through, with the research shown next to each habit: an if-then study slot exported to the calendar (Gollwitzer & Sheeran 2006), a message for one person who checks in (Harkin et al. 2016), and a week-by-week countdown (Kivetz et al. 2006).

## Brand Commitments

- Name: **Bridge**. Tagline: "Your next career, without starting over."
- Microcopy from the team brief: "You're not starting from zero.", "Here's what your experience already gives you.", "Your next 10-minute step.", "A roadmap, not a promise."

## Evidence on Hand

- Fictitious sample CVs in `backend/src/bridge/domain/samples.py` (teacher, nurse, retail manager), labeled as samples.
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
