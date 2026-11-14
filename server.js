// Bridge server: static front end + JSON endpoints for career paths, the
// 30-day roadmap, one practice task and its feedback.
// Nothing the user sends is written to disk or a database.
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { SAMPLES, DEMO_PERSONA } from "./data/samples.js";
import { buildRoadmap, checkRoadmap, clampHours, normalizeTrack, TRACK_INFO, MIN_HOURS, MAX_HOURS } from "./lib/roadmap.js";
import { normalizeCareers, normalizeCareer, normalizeYears } from "./lib/careers.js";
import { normalizeSimulation, scoreEvaluation } from "./lib/simulation.js";
import { recommendCareers, generateRoadmap, generateSimulation, evaluateSimulation, sampleAnswer, transcribePdf, LlmError, MODELS, PROVIDER } from "./server/llm.js";
import * as demo from "./server/demo.js";

const root = path.dirname(fileURLToPath(import.meta.url));
const DEMO_MODE = PROVIDER === "demo";
const MAX_RESUME = 15000;
const MAX_ANSWER = 8000;

const app = express();
app.disable("x-powered-by");

// Request log: method, path, status, time. "aborted" = the browser hung up first.
app.use((req, res, next) => {
  if (!req.path.startsWith("/api/")) return next();
  const t0 = Date.now();
  let done = false;
  res.on("finish", () => {
    done = true;
    console.log(`${new Date().toISOString()} ${req.method} ${req.path} ${res.statusCode} ${Date.now() - t0}ms`);
  });
  res.on("close", () => {
    if (!done) console.log(`${new Date().toISOString()} ${req.method} ${req.path} aborted by client after ${Date.now() - t0}ms`);
  });
  next();
});
// Small JSON bodies everywhere, except the PDF route, which has its own limit.
const smallJson = express.json({ limit: "100kb" });
app.use((req, res, next) => (req.path === "/api/pdf-text" ? next() : smallJson(req, res, next)));
app.use(express.static(path.join(root, "public")));
app.use("/lib", express.static(path.join(root, "lib")));
app.use("/vendor/pdfjs", express.static(path.join(root, "node_modules/pdfjs-dist/build")));
app.use("/vendor/pdfjs-fonts", express.static(path.join(root, "node_modules/pdfjs-dist/standard_fonts")));
app.use("/vendor/pdfjs-cmaps", express.static(path.join(root, "node_modules/pdfjs-dist/cmaps")));
app.use("/vendor/archivo", express.static(path.join(root, "node_modules/@fontsource-variable/archivo/files")));

function bad(res, message) {
  return res.status(400).json({ error: message });
}

function str(value) {
  return typeof value === "string" ? value.trim() : "";
}

// Simple in-memory limit on AI calls per client: protects the API budget.
const AI_LIMIT = 40;
const AI_WINDOW_MS = 10 * 60 * 1000;
const aiCalls = new Map();
function aiRateLimit(req, res, next) {
  const now = Date.now();
  const key = req.ip ?? "unknown";
  const recent = (aiCalls.get(key) ?? []).filter((t) => now - t < AI_WINDOW_MS);
  if (recent.length >= AI_LIMIT) return res.status(429).json({ error: "Too many AI requests from this browser. Wait a few minutes and try again." });
  recent.push(now);
  aiCalls.set(key, recent);
  next();
}

// "live" = real AI, "demo" = no API key, "sample" = user asked for labeled
// sample data (e.g. after an AI error). Demo and sample never call the AI.
function modeFor(req) {
  if (DEMO_MODE) return "demo";
  return req.body?.sample === true ? "sample" : "live";
}

// Form answers -> clean profile. Income fields are dropped on purpose: the
// server never needs them and they are never sent to the AI.
function readCandidate(raw) {
  const p = raw && typeof raw === "object" ? raw : {};
  const words = (v, n, len) =>
    (Array.isArray(v) ? v : typeof v === "string" ? v.split(",") : [])
      .map(str)
      .filter(Boolean)
      .slice(0, n)
      .map((x) => x.slice(0, len));
  const budget = Number(p.monthlyLearningBudget);
  const currency = str(p.currency).toUpperCase();
  return {
    currentRole: str(p.currentRole).slice(0, 120),
    yearsExperience: normalizeYears(p.yearsExperience),
    industry: str(p.industry).slice(0, 120),
    changeMotivation: words(p.changeMotivation, 6, 60),
    hoursPerWeek: clampHours(p.hoursPerWeek),
    monthlyLearningBudget: Number.isFinite(budget) && budget >= 0 ? Math.min(Math.round(budget), 10_000_000) : 0,
    currency: /^[A-Z]{3}$/.test(currency) ? currency : "USD",
    location: str(p.location).slice(0, 80),
    interestedRoles: words(p.interestedRoles, 3, 80),
    transitionPreference: normalizeTrack(p.transitionPreference),
  };
}

function readCareer(raw) {
  const career = normalizeCareer(raw, null);
  return career && career.title ? career : null;
}

app.get("/api/config", (_req, res) => {
  res.json({
    mode: DEMO_MODE ? "demo" : "live",
    model: DEMO_MODE ? null : MODELS,
    samples: SAMPLES.map(({ id, label, resume, track }) => ({ id, label, resume, track })),
    demoPersona: DEMO_PERSONA,
    tracks: TRACK_INFO,
    limits: { maxResume: MAX_RESUME, maxAnswer: MAX_ANSWER, minHours: MIN_HOURS, maxHours: MAX_HOURS },
  });
});

// 1. Three career paths from the resume + constraints.
app.post("/api/career-recommendations", aiRateLimit, async (req, res, next) => {
  try {
    const resume = str(req.body?.resumeText);
    if (resume.length < 80) return bad(res, "Add a bit more about your experience (a few lines at least).");
    if (resume.length > MAX_RESUME) return bad(res, `Your resume is too long. Keep it under ${MAX_RESUME} characters.`);
    const profile = readCandidate(req.body?.profile);
    const mode = modeFor(req);
    const raw = mode === "live" ? await recommendCareers({ resume, profile }) : demo.demoCareers({ resume, profile });
    let careers;
    try {
      careers = normalizeCareers(raw.careers, resume);
    } catch {
      throw new LlmError("The AI did not return 3 distinct career paths. Try again.", 502);
    }
    const p = raw.profile ?? {};
    res.json({
      profile: {
        // The user's own answers win over what the AI read.
        currentRole: profile.currentRole || str(p.currentRole).slice(0, 120) || "Your current role",
        yearsExperience: profile.yearsExperience ?? normalizeYears(p.yearsExperience),
        industry: str(p.industry).slice(0, 120),
        evidenceNote: str(p.evidenceNote).slice(0, 300),
      },
      careers,
      mode,
    });
  } catch (err) {
    next(err);
  }
});

// 2. The 30-day roadmap. Code enforces the weekly time cap and the quick start.
app.post("/api/roadmap", aiRateLimit, async (req, res, next) => {
  try {
    const career = readCareer(req.body?.career);
    if (!career) return bad(res, "Pick a career path first.");
    const profile = readCandidate(req.body?.profile);
    const track = normalizeTrack(req.body?.track ?? profile.transitionPreference);
    const hoursPerWeek = clampHours(req.body?.hoursPerWeek ?? profile.hoursPerWeek);
    const mode = modeFor(req);
    const raw =
      mode === "live"
        ? await generateRoadmap({ profile, career, track, hoursPerWeek })
        : demo.demoRoadmap({ career, track, hoursPerWeek, budget: profile.monthlyLearningBudget });
    let roadmap;
    try {
      roadmap = buildRoadmap(raw, {
        id: randomUUID(),
        candidateId: str(req.body?.candidateId).slice(0, 64) || randomUUID(),
        career,
        currentRole: profile.currentRole,
        track,
        hoursPerWeek,
        createdAt: new Date().toISOString(),
      });
    } catch {
      throw new LlmError("The AI returned an incomplete plan. Try again.", 502);
    }
    const problems = checkRoadmap(roadmap);
    if (problems.length) console.error("Roadmap check failed:", problems);
    res.json({ roadmap, mode });
  } catch (err) {
    next(err);
  }
});

function readTask(raw) {
  const task = { id: str(raw?.id).slice(0, 80), title: str(raw?.title).slice(0, 200), deliverable: str(raw?.deliverable).slice(0, 400) };
  return task.id && task.title ? task : null;
}

// 3. One practice task (simulation) for a roadmap task.
app.post("/api/simulation", aiRateLimit, async (req, res, next) => {
  try {
    const career = readCareer(req.body?.career);
    const task = readTask(req.body?.task);
    if (!career || !task) return bad(res, "Missing career path or roadmap task.");
    const profile = readCandidate(req.body?.profile);
    const mode = modeFor(req);
    const raw = mode === "live" ? await generateSimulation({ profile, career, task }) : demo.demoSimulation({ career });
    let simulation;
    try {
      simulation = normalizeSimulation(raw, { id: task.id, targetRole: career.title });
    } catch {
      throw new LlmError("The AI returned an incomplete practice task. Try again.", 502);
    }
    res.json({ simulation, mode });
  } catch (err) {
    next(err);
  }
});

function readSimulation(raw) {
  try {
    return normalizeSimulation(raw, { id: str(raw?.id).slice(0, 80) || "practice", targetRole: str(raw?.targetRole) });
  } catch {
    return null;
  }
}

// 4. Practice feedback against the visible rubric. Code checks every quote.
app.post("/api/simulation/evaluate", aiRateLimit, async (req, res, next) => {
  try {
    const simulation = readSimulation(req.body?.simulation);
    const answer = str(req.body?.answer);
    if (!simulation) return bad(res, "Missing practice task.");
    if (answer.split(/\s+/).filter(Boolean).length < 15) return bad(res, "Write at least a few sentences (15+ words) before asking for feedback.");
    if (answer.length > MAX_ANSWER) return bad(res, `Your answer is too long. Keep it under ${MAX_ANSWER} characters.`);
    const mode = modeFor(req);
    const raw = mode === "live" ? await evaluateSimulation({ simulation, answer }) : demo.demoEvaluate({ answer, simulation });
    res.json({ evaluation: scoreEvaluation(answer, simulation, raw), mode });
  } catch (err) {
    next(err);
  }
});

// Labeled sample answer so a live demo can move fast.
app.post("/api/simulation/sample-answer", aiRateLimit, async (req, res, next) => {
  try {
    const simulation = readSimulation(req.body?.simulation);
    if (!simulation) return bad(res, "Missing practice task.");
    const mode = modeFor(req);
    const answer =
      mode === "live" ? await sampleAnswer({ simulation, profile: readCandidate(req.body?.profile) }) : demo.demoSampleAnswer({ simulation });
    res.json({ answer: str(answer).slice(0, MAX_ANSWER), mode });
  } catch (err) {
    next(err);
  }
});

// Scanned PDF fallback. Only called after the user clicks "Let the AI read it".
// The file is kept in memory for this request only and never written to disk.
const MAX_PDF_BYTES = 5 * 1024 * 1024;
app.post("/api/pdf-text", aiRateLimit, express.json({ limit: "8mb" }), async (req, res, next) => {
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
const server = app.listen(port, (err) => {
  if (err) {
    console.error(`Could not start on port ${port}: ${err.code ?? err.message}. Is another server already running?`);
    process.exit(1);
  }
  console.log(`Bridge on http://localhost:${port} (${DEMO_MODE ? "DEMO MODE: no API key, fixed sample output" : `live, ${PROVIDER}: ${MODELS.main} + ${MODELS.fast}`})`);
});

// AI calls are bounded at ~4 min worst case; keep sockets open longer than that.
server.requestTimeout = 6 * 60 * 1000;
