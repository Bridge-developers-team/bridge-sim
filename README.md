# Bridge

**Change careers without starting over.**

[![Live](https://img.shields.io/badge/live-bridge--prod-0B1A3A)](https://bridge-prod-xoqy.onrender.com)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)](https://www.python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-API-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Claude](https://img.shields.io/badge/Claude-Sonnet_5.5-D97757)](https://www.anthropic.com)
[![Postgres](https://img.shields.io/badge/Neon-Postgres-4169E1?logo=postgresql&logoColor=white)](https://neon.tech)

Bridge helps working adults (25–45) who want a new career but do not know
where to go. You give it your CV, your LinkedIn profile or a few sentences in
your own words, plus your real week (free hours, budget, city). It gives back:

1. **Three paths that fit you, not your job title.** Each one names what you
   already do, quoted from your own text. Code checks every quote.
2. **A taste of each path.** A 10-minute task from each role, graded, then one
   question: would you enjoy this on a normal Tuesday? The Taste Map plots
   skill against energy and recommends a path.
3. **A 30-day plan that fits your hours.** Weekly tasks, a real course for the
   role, English YouTube lessons, and jobs, recruiters and pay where you live.
4. **Proof.** One click publishes a graded practice task as a public work
   sample you can send to a recruiter.

**Try it:** [bridge-prod-xoqy.onrender.com](https://bridge-prod-xoqy.onrender.com).
"Try the demo" needs no sign-up. Built for Business Cup 2.0 (AIESEC Astana ×
Zimran), November 2026.

---

### Architecture

![How Bridge works: the browser sends the experience text to FastAPI, Claude drafts paths, domain rules check them, and the plan pulls courses, videos, jobs and pay from real sources](docs/architecture.png)

```mermaid
flowchart LR
    USER(["Career changer"])

    subgraph WEB["Browser · React + TypeScript"]
        direction TB
        INPUT["CV · LinkedIn PDF · own words<br>read on the device"]
        STORE[("localStorage<br>journey, no income")]
    end

    subgraph API["FastAPI · Python 3.12"]
        direction TB
        LIMITS["Rate limits<br>daily AI budget"]
        RULES["Domain rules<br>quotes, hours, signed scores"]
    end

    CLAUDE["Claude Sonnet 5.5<br>structured outputs"]

    subgraph DATA["Real sources, never AI-written"]
        direction TB
        COURSES["Course catalog<br>by study field"]
        YT["YouTube Data API<br>English, well watched"]
        JOBS["Adzuna · LinkedIn<br>Indeed · hh.kz"]
        PAY["Official pay<br>BLS · KZ stats"]
    end

    PG[("Neon Postgres<br>proof pages only")]
    PROOF["Public proof page<br>/p/:id"]

    USER --> INPUT
    INPUT -->|"1 POST /api/careers"| LIMITS
    LIMITS -->|"2 prompt by input type"| CLAUDE
    CLAUDE -->|"3 drafts"| RULES
    RULES -->|"4 three checked paths"| STORE
    STORE -.->|"plan requests"| LIMITS
    LIMITS -.-> COURSES
    LIMITS -.-> YT
    LIMITS -.-> JOBS
    LIMITS -.-> PAY
    RULES -->|"5 signed result"| PG
    PG --> PROOF

    classDef client fill:#0E0E10,stroke:#2D3436,color:#FFFFFF
    classDef api fill:#26357A,stroke:#1B2560,color:#FFFFFF
    classDef ai fill:#D97757,stroke:#A4533A,color:#FFFFFF
    classDef data fill:#2F6B4A,stroke:#1E4630,color:#FFFFFF
    classDef db fill:#336791,stroke:#1E3F5A,color:#FFFFFF
    classDef proof fill:#F2B63D,stroke:#B5832A,color:#1B1B1F

    class USER,INPUT,STORE client
    class LIMITS,RULES api
    class CLAUDE ai
    class COURSES,YT,JOBS,PAY data
    class PG db
    class PROOF proof

    style WEB fill:none,stroke:#95A5A6,stroke-width:1px
    style API fill:none,stroke:#95A5A6,stroke-width:1px
    style DATA fill:none,stroke:#95A5A6,stroke-width:1px
```

---

### Why you can trust what it says

- **The AI writes words; code checks every rule.** Quotes must appear in your
  text, plans never exceed your hours, and scores carry a server signature.
  Each rule is a pure function in `backend/src/bridge/domain/` with a test.
- **Personal by design.** The prompt reads a CV, a LinkedIn export and your own
  words differently, weighs your reasons for changing and your constraints,
  and must name at least two details from your text in every path.
- **No invented links.** Courses come from a hand-checked catalog chosen by
  the role's study field (a music teacher is never sent to a programming
  course). Videos come from the YouTube API, filtered for English, views and
  length. Job and recruiter links are LinkedIn, Indeed and hh.kz searches
  with real filters.
- **Privacy.** Your CV is used for one request and never stored. Income never
  leaves the browser. LinkedIn profiles are never scraped: you export your own
  profile as PDF.

### Stack

| Layer | Choice |
|---|---|
| Front end | React 18, TypeScript (strict), Vite, TanStack Query, plain CSS |
| Back end | FastAPI, Python 3.12, uv, SQLAlchemy (async) |
| AI | Claude Sonnet 5.5 (paths, plans, grading), Haiku 5.5 (sample answers) |
| Data | Neon Postgres (proof pages only) |
| Quality | pytest, ruff, ty, import-linter, node:test, Playwright |
| Deploy | Docker on Render, deploys from `preprod` only after CI passes |

### Run it locally

Needs [uv](https://docs.astral.sh/uv/) and Node 24.

```bash
cd backend && uv sync && cp .env.example .env   # add ANTHROPIC_API_KEY, or leave empty for demo mode
uv run uvicorn bridge.main:create_app --factory --reload --port 8000
cd ../frontend && npm ci && npm run dev         # http://localhost:5173
```

Without an API key Bridge runs in **demo mode**: hand-written paths for the
sample CVs, labeled as samples on every screen.

### Tests

```bash
cd backend && uv run pytest                     # rules, AI client (mocked), full API flow
cd frontend && npm test                         # pure front-end logic
cd frontend && npm run build && BASE=http://localhost:8000 npm run e2e   # judge path, phone + desktop
BASE=http://localhost:8000 npm run qa           # deep QA: every input, country, link and reload
```

CI (`.github/workflows/ci.yml`) also runs the API tests on Postgres, an npm
audit and a Docker build.

### Configuration

Set in Render; names only, never values in git.

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Live AI. Without it: demo mode |
| `DATABASE_URL` | Neon connection string |
| `SECRET_KEY` | Signs practice tasks and scores (Render generates it) |
| `AI_CALLS_PER_DAY`, `AI_CALLS_PER_CLIENT` | Spending caps (defaults 400 a day, 40 per visitor per 10 min) |
| `YOUTUBE_API_KEY` | Optional: lesson videos on the plan |
| `ADZUNA_APP_ID`, `ADZUNA_APP_KEY` | Optional: live job listings |

### Repository

```
backend/src/bridge/   domain/ (rules) · llm/ (Claude + demo) · services/ · api/ · db/
frontend/src/         routes/ · components/ · lib/ (pure logic) · state/ · styles/
frontend/e2e/         walk.mjs (judge path) · qa.mjs (deep QA)
docs/                 architecture diagram
brand/                logo and icon kit
```

More: [`DESIGN.md`](DESIGN.md) (visual system), [`PRODUCT.md`](PRODUCT.md)
(product facts), [`CLAUDE.md`](CLAUDE.md) (code rules).
