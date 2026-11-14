# Bridge

**Change careers without starting over.**

Bridge is for working adults (about 25-45) who want to change careers but do not
know where to go. From a CV and a real week, it gives:

1. **Three realistic paths.** Each one reuses what the person already does, and
   every "skill you already have" quotes their own CV. Code checks each quote.
2. **A 30-day plan that fits their hours.** Four weeks of concrete tasks. The
   weekly total never exceeds the hours they said they have, and ticks are
   saved as they go.
3. **A try of the actual job.** A 10-minute practice task from the new role,
   graded against a rubric shown before writing. A score the AI cannot back
   with a quote from the answer is capped.
4. **Proof.** One click publishes the graded task as a public work sample. The
   page can only show scores the server signed.

Prototype for Business Cup 2.0 (AIESEC Astana × Zimran), November 2026.

## Run locally

Needs [uv](https://docs.astral.sh/uv/) and Node 24.

```bash
cd backend && uv sync && cp .env.example .env     # add ANTHROPIC_API_KEY, or leave empty for demo mode
uv run uvicorn bridge.main:create_app --factory --reload --port 8000
cd ../frontend && npm ci && npm run dev           # http://localhost:5173
```

Without an API key the app runs in **demo mode**: hand-written paths for the
sample CVs, template plans and a length-based score, labeled on every screen.

## Tests

```bash
cd backend && uv run pytest            # rules, AI client (mocked SDK), full API flow
cd frontend && npm test                # progress, money check, saved state
cd frontend && npm run build && BASE=http://localhost:8000 npm run e2e   # real browser, phone + desktop
```

CI (`.github/workflows/ci.yml`) also runs ruff, ty, import-linter, the API
tests on Postgres, an npm audit and a Docker build smoke test.

## Deploy

- **App:** Render free web service, built from the `Dockerfile`, configured in
  `render.yaml`. Render deploys `main` only after every CI check passes.
- **Database:** Neon free Postgres. Only published proof pages are stored.

Environment variables (names only, set in Render):

| Name | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Live AI. Without it: demo mode |
| `DATABASE_URL` | Neon connection string (`postgresql://...?sslmode=require`) |
| `SECRET_KEY` | Signs practice tasks and results (Render generates it) |
| `AI_CALLS_PER_DAY` | Hard daily cap on live AI calls (default 400) |
| `AI_CALLS_PER_CLIENT` | Per visitor per 10 minutes (default 40) |
| `LLM_PROVIDER`, `BRIDGE_MODEL`, `BRIDGE_MODEL_FAST` | Optional overrides |

Models: Claude Sonnet 5.5 (`claude-sonnet-5-5`) for paths, plans, practice
tasks and feedback; Claude Haiku 5.5 (`claude-haiku-5-5`) for sample answers.

## Design

Visual system: **Seed Packet Calendar**. The roadmap reads like a planting
calendar: each week is a row of task bars sized by minutes, coloured by kind
and filled when done. See [`DESIGN.md`](DESIGN.md) for tokens and rules and
[`PRODUCT.md`](PRODUCT.md) for product facts.

## How it is built

See `CLAUDE.md` for the layout and the rules.

- **The AI writes text; code owns every rule.** This covers time caps, task
  ids, rubric ids, score caps and quote checks. Each rule is a pure function in
  `backend/src/bridge/domain/` with a test.
- **Privacy.** The CV is used for one request and never stored. Income never
  leaves the browser. Only published proof pages are kept, and the author gets
  a delete key.
- **Not done yet:**
  - live job-market or wage data (O\*NET / BLS);
  - accounts and cross-device sync;
  - payments;
  - practice tasks beyond week 1 use the same engine without special tuning.
