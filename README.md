# Bridge Sim

Test-drive a new career before you pay to switch. Built for two kinds of people:

- **Career changers**: working adults who have wanted to switch for over a year but don't know which field.
- **Recent graduates**: people with a degree who can't find work in their field, or want to point it somewhere new (for example political science to credit risk or machine learning, using the statistics from their thesis).

Paste a resume, or describe your degree, thesis and projects. Bridge Sim builds a **Bridge Map**: the skills you already have, each proven by a quote from your own text, and the roles they reach, ranked by fit. Pick a role and the AI writes three realistic work tasks built from your background. It grades your answers with a fixed hiring-manager rubric and quotes your answer as evidence. You get a shareable portfolio page, resume lines, and a plan in months and dollars.

Prototype for Business Cup </2.0> (AIESEC × Zimran × Nazarbayev University), Nov 2026. Market research and competitors: [`docs/research-graduates.md`](docs/research-graduates.md).

## Run it

Needs Node.js 20.6 or newer.

```bash
npm install
cp .env.example .env      # then paste an Anthropic API key into .env
npm start                 # http://localhost:3000
npm test                  # unit tests: fit, scoring, switch cost, share links
```

AI provider: `ANTHROPIC_API_KEY` uses Claude (`claude-opus-5-5`). `DEEPSEEK_API_KEY` also works (`deepseek-flash`). If both are set, Claude wins unless `LLM_PROVIDER=deepseek`.

With no key, or with `LLM_PROVIDER=demo`, the app runs in **demo mode**. The skill map is keyword matching, and tasks and grades are fixed sample output, not AI. Every page shows a banner saying so.

## Flow

1. **You**: career changer or recent graduate.
2. **Profile**: upload a PDF resume, paste it, or write out degree + thesis + courses + projects, plus an optional "curious about" field. PDFs are read in the browser with pdf.js (`public/pdf.js`); the file never leaves the device and only the text fills the box. For a scanned PDF with no selectable text, the user can click "Let the AI read it": the file goes to `POST /api/pdf-text`, Claude Haiku transcribes it in memory, and nothing is stored.
3. **Bridge Map** (`POST /api/map`): the AI picks skills only from a fixed list of 19 (`data/skills.js`), each with a level from 1 to 3 and a quote. Code checks every quote against the user's text; an unproven skill counts only as level 1. Code then scores 13 roles (`data/roles.js`) on weighted entry-level needs and adds up the study hours for each gap.
4. **Test-drive** (`POST /api/tasks`): 3 tasks for the chosen role, built on the person's industry (changers) or degree methods (graduates). At least one task exercises a gap skill.
5. **Grade** (`POST /api/grade`): the AI gives a level from 0 to 4 for each rubric criterion, with quotes and a resume line. Code checks the quotes, applies the weights and the band.
6. **Portfolio** (`/p.html#…`): scores with evidence, skill evidence, resume lines, and a launch or switch plan (gap hours × sim-score factor ÷ hours per week, course cost, pay change).

## Architecture

1. `server.js` (Express) serves `public/` and the JSON endpoints `/api/config`, `/api/map`, `/api/tasks`, `/api/grade`, `/api/demo-answer`.
2. `server/llm.js`: Claude with structured outputs (zod schemas in `server/schemas.js`). The AI only reads text, writes tasks, grades and drafts.
3. `lib/`: plain-code logic shared by the server, the browser and the tests: `fit.js` (skill quote check, role fit, gap hours, interest match), `scoring.js` (rubric scoring, quote check), `switchCost.js` (plan arithmetic), `shareState.js` (share link).
4. Nothing the AI says is trusted as a number: every level needs a quote found in the user's own text, and every score, rank and plan is computed in code.
5. No database. Results live in the share link's `#hash`, which browsers never send to the server. Drafts stay in the browser tab (sessionStorage).

## What is sample data

- `data/samples.js`: six fictional profiles (3 career changers, 3 graduates), labeled SAMPLE.
- `data/roles.js` and `data/skills.js`: pay, course prices, skill needs per role and study hours per skill level are **placeholders, not yet verified**. Replace them with sourced figures (BLS Occupational Outlook Handbook, provider pricing pages) and review the skill needs with people in each role before using them in a pitch.
- "Fill a sample answer" writes an AI draft answer, labeled as a sample on the task and portfolio pages.

## Privacy

The profile text is sent to the AI provider's API to map skills and write tasks. Bridge Sim does not store it. The portfolio link contains tasks, answers, grades and the verified skill quotes, not the full resume. Not career, financial, medical or tax advice.
