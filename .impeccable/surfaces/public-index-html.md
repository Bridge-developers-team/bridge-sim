---
version: 1
slug: "public-index-html"
primary_target: "frontend/src/routes/PlanPage.tsx"
related_targets: ["frontend/src/styles/tokens.css","frontend/src/styles/components.css","frontend/src/components/GrowingCalendar.tsx","frontend/src/routes/LandingPage.tsx"]
---

## Scope

The Bridge web app (React, client routes): landing, CV upload and constraints (`/start`), career paths (`/paths`), roadmap (`/plan`), practice (`/practice/:id`), public proof page (`/p/:id`). Primary surface: the roadmap (`/plan`). Visitor mode: Operate (the landing hero leans Persuade inside the same world).

## Audience, job, constraints

Working adults 25–45 and recent graduates, evenings at home, laptop or phone. Job: see where they are going, what is planted this week, and the one next step; tick it off and come back. Keep every function, copy line, dark mode, keyboard access and 390px mobile with no sideways page scroll.

## Direction contract

THESIS: The roadmap is a span from where you are to what's next. Four weeks read as rows of task bars inside one navy band, coloured by kind and filled by state, and the next step is the one gold thing on it. It refuses the category default: a checklist under a progress ring.

OWN-WORLD: The Bridge brand kit (brand/), pinned by its own words: "ivory page, white cards, navy text and navy CTAs, thin warm borders, gold only for important accents". Ivory ground, white panels with 1px warm rules, a Midnight Navy band and primary action, navy ink, Signature Gold for the logo and the next step only. Task kinds keep fixed colours: research marigold, learning violet, practice tomato, portfolio leaf green, networking teal, application plum. Inter carries headings and UI; Literata names the target role and the landing headline. State is form first: outline bar = not started, solid = done, a gold ring and "Next" pin on the next bar.

STORY: The visitor reads current role → target role, sees the whole month at once, finds this week's next bar, opens it, does it, ticks it, and watches the bar fill and the count rise.

FIRST VIEWPORT: Top nav (the kit's logo left; Start, Paths, Plan right). A navy band: the target role in large Literata, "from <current role>" beneath, then hours, track and "N of M done". Inside the band sits the growing calendar: four week rows, each task a bar whose length is its minutes, the Next pin on one bar. Directly below, the next-action panel with the single navy primary button. Week detail lists follow.

FORM: Brand-kit pin (Midnight Navy + Signature Gold, brand/README.md), confirmed by the user on 2026-11-15; no roll. Replaced the rolled Seed Packet Calendar (seed:5f88c6c7b1058e32).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Memorable moment

Ticking a task fills its bar in the calendar at the top of the page.
