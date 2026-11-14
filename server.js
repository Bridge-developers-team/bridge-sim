// Bridge Sim server: static front end + 5 JSON endpoints.
// Nothing the user sends is written to disk or a database.
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ROLES, getRole } from "./data/roles.js";
import { SAMPLES } from "./data/samples.js";
import { RUBRIC } from "./lib/rubric.js";
import { scoreTask } from "./lib/scoring.js";
import { verifySkills, levelMap, rankRoles, roleFit } from "./lib/fit.js";
import { SKILLS, SKILL_IDS, SKILL_LEVELS } from "./data/skills.js";
import { generateTasks, gradeAnswer, demoAnswer, mapSkills, transcribePdf, LlmError, MODELS, PROVIDER } from "./server/llm.js";
import * as demo from "./server/demo.js";

const root = path.dirname(fileURLToPath(import.meta.url));
const DEMO_MODE = PROVIDER === "demo";
const MAX_RESUME = 15000;
const MAX_ANSWER = 8000;

const app = express();
app.disable("x-powered-by");
// Small JSON bodies everywhere, except the PDF route, which has its own limit.
const smallJson = express.json({ limit: "100kb" });
app.use((req, res, next) => (req.path === "/api/pdf-text" ? next() : smallJson(req, res, next)));
app.use(express.static(path.join(root, "public")));
app.use("/lib", express.static(path.join(root, "lib")));
app.use("/vendor/pdfjs", express.static(path.join(root, "node_modules/pdfjs-dist/build")));
app.use("/vendor/pdfjs-fonts", express.static(path.join(root, "node_modules/pdfjs-dist/standard_fonts")));
app.use("/vendor/pdfjs-cmaps", express.static(path.join(root, "node_modules/pdfjs-dist/cmaps")));

function bad(res, message) {
  return res.status(400).json({ error: message });
}

function str(value) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanTask(t) {
  if (!t || typeof t !== "object") return null;
  const task = {
    title: str(t.title).slice(0, 200),
    scenario: str(t.scenario).slice(0, 2000),
    inputs: str(t.inputs).slice(0, 3000),
    deliverable: str(t.deliverable).slice(0, 1000),
  };
  return task.title && task.deliverable ? task : null;
}

app.get("/api/config", (_req, res) => {
  res.json({
    mode: DEMO_MODE ? "demo" : "live",
    model: DEMO_MODE ? null : MODELS,
    roles: ROLES,
    samples: SAMPLES,
    rubric: RUBRIC,
    skills: SKILLS,
    skillLevels: SKILL_LEVELS,
  });
});

function readProfile(req, res) {
  const resume = str(req.body?.resume);
  const track = req.body?.track === "graduate" ? "graduate" : "changer";
  if (resume.length < 80) {
    bad(res, "Add a bit more about yourself (a few lines at least).");
    return null;
  }
  if (resume.length > MAX_RESUME) {
    bad(res, `Profile is too long. Keep it under ${MAX_RESUME} characters.`);
    return null;
  }
  return { resume, track };
}

// Bridge Map: AI proposes skills with quotes; code verifies quotes and ranks roles.
app.post("/api/map", async (req, res, next) => {
  try {
    const p = readProfile(req, res);
    if (!p) return;
    const interests = str(req.body?.interests).slice(0, 300);
    const raw = DEMO_MODE ? demo.demoMap({ resume: p.resume }) : await mapSkills({ resume: p.resume, track: p.track, catalog: SKILLS });
    const skills = verifySkills(p.resume, raw.skills, SKILL_IDS);
    const ranking = rankRoles(ROLES, levelMap(skills), SKILLS, interests);
    res.json({ person: raw.person, hiddenStrength: raw.hiddenStrength, skills, ranking, mode: DEMO_MODE ? "demo" : "live" });
  } catch (err) {
    next(err);
  }
});

app.post("/api/tasks", async (req, res, next) => {
  try {
    const role = getRole(req.body?.roleId);
    if (!role) return bad(res, "Pick a target role.");
    const p = readProfile(req, res);
    if (!p) return;
    // Re-check the client's skill list against the profile text (never trust it as-is).
    const claimed = Array.isArray(req.body?.skills)
      ? req.body.skills.slice(0, 40).map((x) => ({ id: x?.id, level: x?.levelRaw ?? x?.level, evidence: x?.evidence }))
      : [];
    const levels = levelMap(verifySkills(p.resume, claimed, SKILL_IDS));
    const fit = roleFit(role, levels, SKILLS);
    const strengths = role.needs.filter((n) => (levels[n.skill] ?? 0) > 0).map((n) => ({ id: n.skill, level: levels[n.skill] }));
    const gaps = fit.gaps.map((g) => ({ id: g.skill, level: g.have }));
    const person = req.body?.person && typeof req.body.person === "object" ? { situation: str(req.body.person.situation), field: str(req.body.person.field) } : null;
    const out = DEMO_MODE
      ? demo.demoTasks({ role, person })
      : await generateTasks({ resume: p.resume, role, track: p.track, strengths, gaps, catalog: SKILLS });
    res.json({ ...out, roleId: role.id, mode: DEMO_MODE ? "demo" : "live" });
  } catch (err) {
    next(err);
  }
});

app.post("/api/grade", async (req, res, next) => {
  try {
    const role = getRole(req.body?.roleId);
    const task = cleanTask(req.body?.task);
    const answer = str(req.body?.answer);
    const profile = req.body?.profile ?? null;
    if (!role) return bad(res, "Unknown role.");
    if (!task) return bad(res, "Missing task.");
    if (answer.split(/\s+/).length < 15) return bad(res, "Write at least a few sentences (15+ words) before grading.");
    if (answer.length > MAX_ANSWER) return bad(res, `Answer is too long. Keep it under ${MAX_ANSWER} characters.`);
    const graded = DEMO_MODE ? demo.demoGrade({ answer }) : await gradeAnswer({ role, task, answer, profile });
    const scored = scoreTask(answer, graded.criteria);
    res.json({ ...scored, strength: graded.strength, topFix: graded.topFix, resumeBullet: graded.resumeBullet ?? "", mode: DEMO_MODE ? "demo" : "live" });
  } catch (err) {
    next(err);
  }
});

app.post("/api/demo-answer", async (req, res, next) => {
  try {
    const role = getRole(req.body?.roleId);
    const task = cleanTask(req.body?.task);
    if (!role || !task) return bad(res, "Missing role or task.");
    const answer = DEMO_MODE ? demo.demoAnswer() : await demoAnswer({ role, task, profile: req.body?.profile });
    res.json({ answer });
  } catch (err) {
    next(err);
  }
});

// Scanned PDF fallback. Only called after the user clicks "Let the AI read it".
// The file is kept in memory for this request only and never written to disk.
const MAX_PDF_BYTES = 5 * 1024 * 1024;
app.post("/api/pdf-text", express.json({ limit: "8mb" }), async (req, res, next) => {
  try {
    if (DEMO_MODE) return bad(res, "Demo mode can't read scanned PDFs. Paste the text instead.");
    const b64 = typeof req.body?.data === "string" ? req.body.data : "";
    const buf = Buffer.from(b64, "base64");
    if (buf.length === 0) return bad(res, "No file received.");
    if (buf.length > MAX_PDF_BYTES) return bad(res, "That PDF is over 5 MB.");
    if (buf.subarray(0, 5).toString("latin1") !== "%PDF-") return bad(res, "That file is not a PDF.");
    const text = (await transcribePdf({ base64: buf.toString("base64") })).trim();
    if (text.length < 40) return bad(res, "Could not read text from that PDF. Paste the text instead.");
    res.json({ text: text.slice(0, MAX_RESUME) , truncated: text.length > MAX_RESUME });
  } catch (err) {
    next(err);
  }
});

app.get("/healthz", (_req, res) => res.json({ ok: true, mode: DEMO_MODE ? "demo" : "live" }));

app.use((err, _req, res, _next) => {
  if (err instanceof LlmError) return res.status(err.status).json({ error: err.message });
  if (err?.type === "entity.parse.failed") return res.status(400).json({ error: "Bad request body." });
  if (err?.type === "entity.too.large") return res.status(413).json({ error: "That file is too large." });
  console.error(err);
  res.status(500).json({ error: "Something went wrong on our side. Try again." });
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, (err) => {
  if (err) {
    console.error(`Could not start on port ${port}: ${err.code ?? err.message}. Is another server already running?`);
    process.exit(1);
  }
  console.log(`Bridge Sim on http://localhost:${port} (${DEMO_MODE ? "DEMO MODE: no API key, fixed sample output" : `live, ${PROVIDER}: ${MODELS.main} + ${MODELS.fast}`})`);
});
