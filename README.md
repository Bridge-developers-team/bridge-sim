# Bridge Sim

Test-drive a new career before you pay to switch. Paste your resume and pick a target role. The AI writes three realistic work tasks for that role, set in the industry you already know. It grades your answers with a fixed hiring-manager rubric that quotes your own words as evidence. You get a shareable portfolio page and a switch-cost plan (months of learning, course cost, income gap).

Prototype for Business Cup </2.0> (AIESEC × Zimran × Nazarbayev University), Nov 2026.

## Run it

Needs Node.js 20.6 or newer.

```bash
npm install
cp .env.example .env      # then paste an Anthropic OR DeepSeek API key into .env
npm start                 # http://localhost:3000
npm test                  # unit tests for scoring, switch cost, share links
```

AI provider: `ANTHROPIC_API_KEY` uses Claude (`claude-opus-5-5`); `DEEPSEEK_API_KEY` uses DeepSeek (`deepseek-flash`, change with `BRIDGE_MODEL`). If both are set, Claude wins unless `LLM_PROVIDER=deepseek`.

With no key the app runs in **demo mode**: tasks and grades are fixed sample output, not AI, and every page shows a banner saying so.

## Architecture

1. `server.js` (Express) serves the static front end in `public/` and 3 JSON endpoints: `/api/tasks`, `/api/grade`, `/api/demo-answer`.
2. `server/llm.js` calls Claude with structured outputs, or DeepSeek in JSON mode; both are checked against the zod schemas in `server/schemas.js` (DeepSeek replies are validated in code and retried once). The AI is used only to read the resume, write tasks, grade against the rubric and draft labeled sample answers.
3. `lib/` holds the plain-code logic, shared by server, browser and tests: rubric (`rubric.js`), weighted scoring and evidence-quote checks (`scoring.js`), switch-cost arithmetic (`switchCost.js`), share-link encoding (`shareState.js`).
4. Grading is checked in code: every level must come with a quote that really appears in the answer, or it is capped at 1.
5. No database. Results live in the share link's `#hash`, which browsers never send to the server.

## What is sample data

- `data/samples.js`: three fictional resumes, labeled SAMPLE.
- `data/roles.js`: pay, learning hours and course prices are **placeholders, not yet verified**. Replace them with sourced figures (BLS Occupational Outlook Handbook, provider pricing pages) before using them in a pitch.
- "Fill a sample answer" writes an AI draft answer, labeled as a sample on the task and portfolio pages.

## Privacy

The resume is sent to the chosen AI provider's API (Anthropic or DeepSeek) to write tasks and is not stored by Bridge Sim. The portfolio link contains the tasks, answers and grades, not the resume. Not career, financial, medical or tax advice.
