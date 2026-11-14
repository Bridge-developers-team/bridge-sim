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

THESIS: The roadmap is a planting calendar. Four weeks read as rows of task bars, coloured by kind like seed varieties and filled by state, so the next step is the next bar going into the ground. It refuses the category default: a checklist under a progress ring.

OWN-WORLD: Seed-packet print. Pale leaf-paper ground, white packet-stock panels with 1px rules, a packet-green shell band and primary action, near-black green ink. Task kinds keep fixed variety colours: research marigold, learning violet, practice tomato, portfolio leaf green, networking teal, application plum. Archivo condensed heavy caps are the variety-name voice for headings; the system sans carries UI text. State is form first: outline bar = not started, solid = done, a "Next" pin on the next bar.

STORY: The visitor reads current role → target role, sees the whole month at once, finds this week's next bar, opens it, does it, ticks it, and watches the bar fill and the count rise.

FIRST VIEWPORT: Top nav (wordmark left; Explore, My Roadmap, Practice right). A packet-green band: the target role in large condensed caps, "from <current role>" beneath, then hours, track and "N of M done". Inside the band sits the growing calendar: four week rows, each task a bar whose length is its minutes, the Next pin on one bar. Directly below, the next-action panel with the single green primary button. Week detail lists follow.

FORM: Seed Packet Calendar, position 6 of my ordered grounded list (assigned by the roll). seed:5f88c6c7b1058e32

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Memorable moment

Ticking a task fills its bar in the calendar at the top of the page.
