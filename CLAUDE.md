# Bridge: working rules

Career-transition navigator for US adults 25-45 (Business Cup 2.0 hackathon,
B2C, web). Resume -> 3 career paths -> 30-day plan -> 10-minute practice task
graded on a visible rubric -> public proof page.

## Layout

```
backend/   FastAPI + Python 3.12, managed with uv
  src/bridge/
    domain/    pure rules and models: no web, DB or AI imports (enforced)
    llm/       writers: ClaudeWriter (live) and DemoWriter (labeled samples)
    db/        SQLAlchemy async, one table (proofs)
    services/  one module per use case; signing; rate limits
    api/       thin routers, request/response schemas, error shape
    main.py    app factory: wiring + serving the built front end
  tests/       domain/, llm/, api/ (API tests run on SQLite and on Postgres in CI)
frontend/  React 18 + Vite + TypeScript + TanStack Query, plain CSS
  src/api/        client.ts, types.ts (mirror of backend models), bridge.ts (one fn per route)
  src/lib/        pure logic (progress, finance, journey); tests/ cover it
  src/state/      the journey store (localStorage)
  src/components/ ui/ primitives; GrowingCalendar (the design's signature)
  src/routes/     one page per file
  src/styles/     tokens.css + components.css: the Seed Packet Calendar (DESIGN.md)
  e2e/walk.mjs    real-browser walk of the judge path
Dockerfile, render.yaml, .github/workflows/ci.yml
```

## Rules

- **Design:** `DESIGN.md` is the visual spec (Seed Packet Calendar) and
  `PRODUCT.md` the product facts; `.impeccable/` records the design direction.
  One packet-green band per screen, no kickers above headings, no gradients,
  colours only with a job. Change the spec first, then the CSS.
- **Layers point inward.** `api -> services -> llm | db -> domain`. import-linter
  fails CI on a wrong import. A router never contains logic; a rule lives in
  `domain/` with a test.
- **The AI writes text; code owns rules.** Counts, time budgets, ids, scores and
  quote checks are in `domain/`. AI output is a *draft* (`domain/drafts.py`, also
  the structured-output schema); `domain/` turns drafts into what users see.
- **Never fake AI.** Anything not from the live model is labeled: mode is
  `live`, `demo` (no key on the server) or `sample` (user chose sample data),
  and the UI shows a banner for the last two. Proof pages keep the label.
- **Honesty rules:** no salaries, prices, job listings, hiring dates or URLs are
  generated. Effort is qualitative. Practice feedback is "practice, not a hiring
  decision".
- **Privacy:** resume text is never stored (browser memory only, server uses it
  for one request). Income never leaves the browser. Only a proof the user
  publishes is stored, with a delete key.
- **Tamper evidence:** practice tasks and graded results are HMAC-signed
  (`services/signing.py`); a proof can only show scores the server gave.
- **Wire format is camelCase.** Change `domain/models.py` and
  `frontend/src/api/types.ts` together.
- **Spend:** per-client and per-day limits on live AI calls
  (`services/limits.py`); `/healthz` must never touch the database (Neon would
  never sleep and burn the free compute).
- **Tests stay lean:** one test per rule or trap. Add the test in the same change.

## Commands

```bash
cd backend && uv sync && uv run uvicorn bridge.main:create_app --factory --reload   # API on :8000
cd frontend && npm ci && npm run dev                                               # UI on :5173, proxies /api
cd backend && uv run pytest && uv run ruff check . && uv run ruff format --check . && uv run ty check src && uv run lint-imports
cd frontend && npm test && npm run build
cd frontend && BASE=http://localhost:8000 npm run e2e    # needs `npm run build` and the API running
```

## Git

One branch and one PR per change; commit messages are plain-English sentences
about what the user gets. PRs go into `preprod`, which is production: Render
deploys it after CI passes. Push, merge
and deploy only when asked.
