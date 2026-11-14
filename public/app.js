// Bridge front end. Flow (hash routes, so Back works):
//   #/               landing
//   #/start, #/start/2  onboarding: background, then constraints
//   #/explore        3 career paths + side-by-side comparison
//   #/roadmap        the 30-day roadmap (hero): next action, weeks, progress
//   #/practice/<id>  one in-app practice task with a visible rubric + feedback
//   #/case-study/<id> printable / downloadable case study of that practice
//
// Storage: non-sensitive structured progress goes to localStorage (career
// paths, roadmap, ticks, practice answers). The resume text and any income
// numbers stay in memory only and are gone after a reload, by design.
import { el, mount, api, wordCount, modeBanner, money } from "/ui.js";
import {
  TRACKS,
  TRACK_INFO,
  progress,
  nextAction,
  weekStatus,
  weekMinutes,
  setTaskCompleted,
  findTask,
  mergeProgress,
  allTasks,
  clampHours,
  QUICK_TASK_MAX_MIN,
  MIN_HOURS,
  MAX_HOURS,
} from "/lib/roadmap.js";
import { transitionCost, belowMinimum, amount } from "/lib/finance.js";

const app = document.getElementById("app");
const nav = document.getElementById("nav");
const STORE_KEY = "bridge-v1";

const MOTIVATIONS = ["Better pay", "Better work-life balance", "More meaningful work", "Less stress", "More flexibility", "Room to grow"];
const CURRENCIES = ["USD", "EUR", "GBP", "KZT", "CAD", "AUD", "INR"];
const TYPE_LABEL = { research: "Research", learning: "Learning", simulation: "Practice in app", portfolio: "Portfolio", networking: "Networking", application: "Application" };
const EFFORT_LABEL = { lower: "Lower effort", medium: "Medium effort", higher: "Higher effort", unknown: "Effort unknown" };
const STATUS_LABEL = { "not-started": "Not started", "in-progress": "In progress", completed: "Completed" };

let config = null;

// ---------- state ----------
function emptyForm() {
  return {
    resumeText: "",
    currentRole: "",
    yearsExperience: "",
    changeMotivation: [],
    hoursPerWeek: 5,
    monthlyLearningBudget: 0,
    currency: "USD",
    location: "",
    interestedRoles: "",
    transitionPreference: "balanced",
    // Sensitive: memory only, never sent to the server or saved.
    currentMonthlyIncome: "",
    minimumAcceptableIncome: "",
  };
}

const memory = {
  form: emptyForm(),
  money: { expectedMonthlyIncome: "", monthsReduced: "", learningMonths: "1" },
  ui: { open: new Set(), confirm: null, notice: "", explorerEdit: false },
};

// Saved state (no resume, no income).
let saved = blankSaved();
function blankSaved() {
  return {
    v: 1,
    candidateId: crypto.randomUUID?.() ?? String(Date.now()),
    profile: null, // CandidateProfile without resumeText or income
    recs: null, // { profile, careers, mode }
    selectedCareerId: null,
    roadmap: null,
    roadmapMode: null,
    practice: {}, // taskId -> { simulation, mode, answer, sampleUsed, evaluation, evalMode, attempts, submitted, reflection }
  };
}

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
    if (d && d.v === 1) saved = { ...blankSaved(), ...d };
  } catch {
    /* storage blocked or corrupt: start fresh */
  }
}

function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(saved));
  } catch {
    /* storage blocked: progress lasts for this tab only */
  }
}

function resetAll() {
  try {
    localStorage.removeItem(STORE_KEY);
  } catch {
    /* ignore */
  }
  saved = blankSaved();
  memory.form = emptyForm();
  memory.ui = { open: new Set(), confirm: null, notice: "", explorerEdit: false };
}

// Profile for the API: no resume, no income.
function apiProfile(src = memory.form) {
  return {
    currentRole: String(src.currentRole ?? "").trim(),
    yearsExperience: src.yearsExperience === "" ? null : src.yearsExperience,
    industry: src.industry ?? "",
    changeMotivation: src.changeMotivation ?? [],
    hoursPerWeek: Number(src.hoursPerWeek),
    monthlyLearningBudget: Number(src.monthlyLearningBudget),
    currency: src.currency,
    location: String(src.location ?? "").trim(),
    interestedRoles: Array.isArray(src.interestedRoles)
      ? src.interestedRoles
      : String(src.interestedRoles ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
    transitionPreference: src.transitionPreference,
  };
}

function selectedCareer() {
  return saved.recs?.careers.find((c) => c.id === saved.selectedCareerId) ?? null;
}

// ---------- helpers ----------
function go(hash) {
  if (location.hash === hash) route();
  else location.hash = hash;
}

function loading(message, sub) {
  mount(
    app,
    el("div", { class: "card loading", role: "status" }, el("div", { class: "spinner", "aria-hidden": "true" }), el("p", {}, message), sub ? el("p", { class: "muted" }, sub) : null),
  );
}

// Error with Retry, and (live mode only) an honest sample-data fallback.
function errorPanel(message, { onRetry, onSample, onBack, backLabel = "Back" } = {}) {
  return el(
    "div",
    { class: "error", role: "alert" },
    el("p", { class: "flush" }, message),
    el(
      "div",
      { class: "actions" },
      onRetry ? el("button", { type: "button", class: "primary", onclick: onRetry }, "Try again") : null,
      onSample && config.mode === "live" ? el("button", { type: "button", class: "secondary", onclick: onSample }, "Use labeled sample data instead") : null,
      onBack ? el("button", { type: "button", class: "secondary", onclick: onBack }, backLabel) : null,
    ),
  );
}

function pill(text, cls = "") {
  return el("span", { class: "pill " + cls }, text);
}

function minutes(n) {
  if (n < 60) return `${n} min`;
  const h = Math.floor(n / 60);
  const m = n % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

function hoursText(h) {
  return `${h} hour${h === 1 ? "" : "s"} per week`;
}

function renderNav(active) {
  const items = [
    ["explore", "Explore", "#/explore"],
    ["roadmap", "My Roadmap", "#/roadmap"],
    ["practice", "Practice", "#/practice"],
  ];
  mount(
    nav,
    items.map(([key, label, href]) => el("a", { href, class: key === active ? "active" : "", "aria-current": key === active ? "page" : null }, label)),
  );
}

// ---------- router ----------
function route() {
  const [, page, arg] = (location.hash || "#/").split("/");
  window.scrollTo(0, 0);
  memory.ui.confirm = null;
  if (page === "start") return renderOnboarding(arg === "2" ? 2 : 1);
  if (page === "explore") return renderExplore();
  if (page === "roadmap") return renderRoadmap();
  if (page === "practice") return renderPractice(arg ? decodeURIComponent(arg) : null);
  if (page === "case-study") return renderCaseStudy(arg ? decodeURIComponent(arg) : null);
  return renderLanding();
}

// ---------- A. Landing ----------
function startDemo() {
  const p = config.demoPersona;
  const sample = config.samples.find((s) => s.id === p.sampleId);
  memory.form = {
    ...emptyForm(),
    ...p,
    resumeText: sample?.resume ?? "",
    yearsExperience: p.yearsExperience ?? "",
    interestedRoles: (p.interestedRoles ?? []).join(", "),
  };
  memory.demoLoaded = true;
  go("#/start");
}

function renderLanding() {
  renderNav(null);
  const r = saved.roadmap;
  const pr = r ? progress(r) : null;
  mount(
    app,
    modeBanner(config.mode),
    r
      ? el(
          "section",
          { class: "card resume-card" },
          el("p", { class: "eyebrow" }, "Welcome back"),
          el("h2", { class: "flush" }, `${r.currentRole} → ${r.targetRole}`),
          el("p", { class: "muted" }, `${pr.done} of ${pr.total} tasks done.`),
          el("a", { class: "button primary", href: "#/roadmap" }, "Continue my roadmap"),
        )
      : null,
    el(
      "section",
      { class: "hero" },
      el("h1", {}, "Change careers without starting over."),
      el("p", { class: "lead" }, "Upload your résumé, discover realistic career paths, and get a weekly plan you can actually follow."),
      el(
        "div",
        { class: "actions" },
        el(
          "button",
          {
            type: "button",
            class: "primary big",
            onclick: () => {
              if (memory.demoLoaded) memory.form = emptyForm();
              memory.demoLoaded = false;
              go("#/start");
            },
          },
          "Build My Career Roadmap",
        ),
        el("button", { type: "button", class: "secondary big", onclick: startDemo }, "Try Demo"),
      ),
      el("p", { class: "fine" }, "Try Demo loads a fictitious teacher with 7 years of experience, 5 free hours a week and no learning budget. No sign-up."),
    ),
    el(
      "ul",
      { class: "values" },
      [
        ["Discover realistic paths", "Three careers that build on what you already do, with honest trade-offs."],
        ["See transferable skills", "Each skill is backed by a quote from your own résumé."],
        ["Get a clear action plan", "Four weeks of small tasks that fit your hours, starting with a 10-minute step."],
      ].map(([h, p]) => el("li", {}, el("strong", {}, h), el("span", { class: "muted" }, p))),
    ),
  );
}

// ---------- B. Onboarding ----------
function stepper(current) {
  const steps = ["Your background", "Your constraints", "Career paths", "Roadmap"];
  return el(
    "ol",
    { class: "steps", "aria-label": "Setup progress" },
    steps.map((label, i) => el("li", { class: i + 1 < current ? "done" : i + 1 === current ? "now" : "", "aria-current": i + 1 === current ? "step" : null }, label)),
  );
}

function fieldError(id, msg) {
  return msg ? el("p", { id, class: "field-error", role: "alert" }, msg) : null;
}

// Typing in a field clears its old error message.
function clearErrorOnInput(input) {
  input.addEventListener("input", () => {
    input.removeAttribute("aria-invalid");
    input.closest(".field")?.querySelector(".field-error")?.remove();
  });
  return input;
}

function textInput(key, attrs = {}) {
  const input = el("input", { type: "text", id: `f-${key}`, ...attrs });
  input.value = memory.form[key] ?? "";
  input.addEventListener("input", () => (memory.form[key] = input.value));
  return clearErrorOnInput(input);
}

function numberInput(key, attrs = {}) {
  const input = el("input", { type: "number", id: `f-${key}`, inputmode: "decimal", ...attrs });
  input.value = memory.form[key] ?? "";
  input.addEventListener("input", () => (memory.form[key] = input.value));
  return clearErrorOnInput(input);
}

function renderOnboarding(step, errors = {}) {
  renderNav(null);
  if (step === 2 && memory.form.resumeText.trim().length < 80) step = 1;
  return step === 1 ? renderBackground(errors) : renderConstraints(errors);
}

function renderBackground(errors) {
  const f = memory.form;
  const textarea = el("textarea", {
    id: "f-resume",
    rows: 14,
    placeholder: "Paste your résumé here, or describe your work in a few lines: your role, years, what you do, what you're proud of…",
    "aria-describedby": "resume-help" + (errors.resume ? " err-resume" : ""),
    "aria-invalid": errors.resume ? "true" : null,
  });
  textarea.value = f.resumeText;
  textarea.addEventListener("input", () => (f.resumeText = textarea.value));

  // PDF upload: read in the browser; scanned PDFs go to the AI only on request.
  const status = el("div", { class: "upload-status", role: "status", "aria-live": "polite" });
  const showStatus = (kind, ...parts) => mount(status, el("div", { class: kind === "error" ? "error" : kind === "warn" ? "warn" : "callout" }, ...parts));
  const fileInput = el("input", { type: "file", accept: ".pdf,application/pdf", id: "pdf-file", class: "visually-hidden" });
  const useText = (text, note) => {
    f.resumeText = text;
    textarea.value = text;
    showStatus("ok", note, " Check the text below and fix anything that came out wrong.");
  };
  async function handleFile(file) {
    if (!file) return;
    showStatus("ok", `Reading ${file.name}…`);
    try {
      const { extractPdfText, fileToBase64 } = await import("/pdf.js");
      const { text, pages, totalPages } = await extractPdfText(file);
      const pageNote = totalPages > pages ? ` (first ${pages} of ${totalPages} pages)` : ` (${pages} page${pages === 1 ? "" : "s"})`;
      if (text.length >= 80) return useText(text.slice(0, config.limits.maxResume), `Loaded ${file.name}${pageNote}.`);
      if (config.mode !== "live") return showStatus("warn", `${file.name} has no selectable text (it looks scanned). Paste the text instead.`);
      const askBtn = el(
        "button",
        {
          type: "button",
          class: "secondary",
          onclick: async () => {
            askBtn.disabled = true;
            askBtn.textContent = "Reading with AI…";
            try {
              const out = await api("/api/pdf-text", { data: await fileToBase64(file) });
              useText(out.text, `AI transcribed ${file.name}.`);
            } catch (err) {
              showStatus("error", err.message);
            }
          },
        },
        "Let the AI read it",
      );
      showStatus("warn", `${file.name} has no selectable text (it looks like a scan). The AI can read it: the file is sent to Anthropic for this one request and not stored. `, el("div", { class: "actions" }, askBtn));
    } catch (err) {
      showStatus("error", err.message);
    } finally {
      fileInput.value = "";
    }
  }
  fileInput.addEventListener("change", () => handleFile(fileInput.files?.[0]));
  textarea.addEventListener("dragover", (e) => (e.preventDefault(), textarea.classList.add("dragging")));
  textarea.addEventListener("dragleave", () => textarea.classList.remove("dragging"));
  textarea.addEventListener("drop", (e) => {
    e.preventDefault();
    textarea.classList.remove("dragging");
    handleFile(e.dataTransfer?.files?.[0]);
  });

  const samples = config.samples.filter((s) => s.track === "changer");
  const years = numberInput("yearsExperience", { min: 0, max: 60, step: 1, placeholder: "e.g. 7" });

  mount(
    app,
    modeBanner(config.mode),
    stepper(1),
    el(
      "form",
      {
        class: "card",
        novalidate: true,
        onsubmit: (e) => {
          e.preventDefault();
          const errs = {};
          if (f.resumeText.trim().length < 80) errs.resume = "Paste your résumé, or describe your work in at least a few lines (80+ characters). No résumé at hand? Use Try Demo.";
          if (f.resumeText.length > config.limits.maxResume) errs.resume = `That's too long. Keep it under ${config.limits.maxResume.toLocaleString("en-US")} characters.`;
          const y = f.yearsExperience;
          if (y !== "" && (!(Number(y) >= 0) || Number(y) > 60)) errs.years = "Enter a number of years from 0 to 60, or leave it blank.";
          if (Object.keys(errs).length) return renderOnboarding(1, errs);
          go("#/start/2");
        },
      },
      memory.demoLoaded ? el("p", { class: "callout" }, el("strong", {}, "Demo profile loaded. "), "A fictitious teacher with 7 years of experience. Look it over, then continue.") : null,
      !f.resumeText && saved.recs ? el("p", { class: "callout" }, "For your privacy, your résumé is not saved. Paste it again to get new career paths.") : null,
      el("h2", {}, "Your background"),
      el("p", { id: "resume-help", class: "muted" }, "Upload or paste your résumé. Bridge reads it to find skills that already count in a new career."),
      el(
        "div",
        { class: "upload-row" },
        fileInput,
        el("label", { for: "pdf-file", class: "button secondary upload-btn" }, "Upload PDF résumé"),
        el("span", { class: "small muted" }, "Read in your browser; only the text is used."),
      ),
      status,
      el("label", { for: "f-resume", class: "label" }, "Résumé or work description"),
      textarea,
      fieldError("err-resume", errors.resume),
      el(
        "div",
        { class: "chips" },
        el("span", { class: "small muted" }, "Or try a sample:"),
        samples.map((s) =>
          el("button", { type: "button", class: "chip", onclick: () => ((f.resumeText = s.resume), renderOnboarding(1)) }, s.label.replace(/^Sample: /, "")),
        ),
      ),
      el(
        "div",
        { class: "grid2" },
        el("label", { class: "field" }, "Current role ", el("span", { class: "muted small" }, "(optional: we can read it from your résumé)"), textInput("currentRole", { placeholder: "e.g. Middle-school teacher" })),
        el("label", { class: "field" }, "Years in this career ", el("span", { class: "muted small" }, "(optional)"), years, fieldError("err-years", errors.years)),
      ),
      el("div", { class: "actions split" }, el("a", { href: "#/", class: "button secondary" }, "Back"), el("button", { type: "submit", class: "primary" }, "Next: your constraints")),
      el("p", { class: "fine" }, "Privacy: your résumé is never published or saved by Bridge. It is sent to the AI once to suggest career paths and is forgotten when you close or reload this page."),
    ),
  );
}

function renderConstraints(errors, failure) {
  const f = memory.form;
  const motivation = el(
    "div",
    { class: "chips", role: "group", "aria-label": "Why do you want to change?" },
    MOTIVATIONS.map((m) => {
      const b = el("button", { type: "button", class: "chip toggle", "aria-pressed": f.changeMotivation.includes(m) ? "true" : "false" }, m);
      b.addEventListener("click", () => {
        f.changeMotivation = f.changeMotivation.includes(m) ? f.changeMotivation.filter((x) => x !== m) : [...f.changeMotivation, m];
        b.setAttribute("aria-pressed", f.changeMotivation.includes(m) ? "true" : "false");
      });
      return b;
    }),
  );
  const currency = el("select", { id: "f-currency", "aria-label": "Currency" }, CURRENCIES.map((c) => el("option", { value: c, selected: c === f.currency }, c)));
  currency.addEventListener("change", () => (f.currency = currency.value));

  const trackRadios = el(
    "fieldset",
    { class: "tracks" },
    el("legend", {}, "How fast do you want to move?"),
    TRACKS.map((t) => {
      const input = el("input", { type: "radio", name: "track", value: t, checked: f.transitionPreference === t });
      input.addEventListener("change", () => (f.transitionPreference = t));
      return el("label", { class: "track-option" }, input, el("span", {}, el("strong", {}, TRACK_INFO[t].label), el("span", { class: "small muted" }, TRACK_INFO[t].summary)));
    }),
  );

  const moneyOpen = Boolean(f.currentMonthlyIncome || f.minimumAcceptableIncome);

  async function submit(sample = false) {
    const errs = {};
    const h = Number(f.hoursPerWeek);
    if (!(h >= MIN_HOURS && h <= MAX_HOURS)) errs.hours = `Enter between ${MIN_HOURS} and ${MAX_HOURS} hours per week.`;
    const b = f.monthlyLearningBudget;
    if (b === "" || !(Number(b) >= 0)) errs.budget = "Enter 0 or more. Use 0 for free resources only.";
    for (const k of ["currentMonthlyIncome", "minimumAcceptableIncome"]) if (f[k] !== "" && amount(f[k]) === null) errs[k] = "Enter a number of 0 or more, or leave it blank.";
    if (Object.keys(errs).length) return renderConstraints(errs);
    loading("Reading your experience and finding 3 realistic career paths…", "Usually 15–30 seconds. Your answers are kept if anything goes wrong.");
    try {
      const out = await api("/api/career-recommendations", { resumeText: f.resumeText, profile: apiProfile(), sample });
      saved.profile = { ...apiProfile(), currentRole: out.profile.currentRole, yearsExperience: out.profile.yearsExperience, industry: out.profile.industry };
      saved.recs = out;
      if (!f.currentRole) f.currentRole = out.profile.currentRole;
      if (f.yearsExperience === "" && out.profile.yearsExperience !== null) f.yearsExperience = out.profile.yearsExperience;
      save();
      go("#/explore");
    } catch (err) {
      renderConstraints({}, { message: err.message, retry: () => submit(sample), sample: () => submit(true) });
    }
  }

  mount(
    app,
    modeBanner(config.mode),
    stepper(2),
    el(
      "form",
      { class: "card", novalidate: true, onsubmit: (e) => (e.preventDefault(), submit()) },
      el("h2", {}, "Your constraints"),
      el("p", { class: "muted" }, "Your plan has to fit your real life. These answers shape every week of it."),
      el(
        "div",
        { class: "grid2" },
        el(
          "label",
          { class: "field" },
          "Free hours per week for the switch",
          numberInput("hoursPerWeek", { min: MIN_HOURS, max: MAX_HOURS, step: 0.5, required: true, "aria-invalid": errors.hours ? "true" : null }),
          fieldError("err-hours", errors.hours),
        ),
        el(
          "div",
          { class: "field" },
          el("label", { for: "f-monthlyLearningBudget" }, "Monthly learning budget"),
          el("div", { class: "row tight nowrap" }, numberInput("monthlyLearningBudget", { min: 0, step: 1, required: true, "aria-invalid": errors.budget ? "true" : null }), currency),
          el("span", { class: "small muted" }, "0 = free resources only."),
          fieldError("err-budget", errors.budget),
        ),
      ),
      el("p", { class: "label" }, "Why do you want to change? ", el("span", { class: "muted small" }, "(optional, pick any)")),
      motivation,
      trackRadios,
      el(
        "div",
        { class: "grid2" },
        el("label", { class: "field" }, "Roles you're curious about ", el("span", { class: "muted small" }, "(optional, comma-separated)"), textInput("interestedRoles", { placeholder: "e.g. instructional designer" })),
        el("label", { class: "field" }, "Country or city ", el("span", { class: "muted small" }, "(optional)"), textInput("location", { placeholder: "e.g. Kazakhstan" })),
      ),
      el(
        "details",
        { open: moneyOpen || errors.currentMonthlyIncome || errors.minimumAcceptableIncome ? true : null },
        el("summary", {}, "Add money details (optional)"),
        el("p", { class: "small muted" }, `Only used for your own money check on the roadmap page. Never sent to the server or saved: these numbers are gone when you reload. Amounts in ${f.currency} per month.`),
        el(
          "div",
          { class: "grid2" },
          el("label", { class: "field" }, "Current monthly income", numberInput("currentMonthlyIncome", { min: 0, step: 1 }), fieldError("err-cmi", errors.currentMonthlyIncome)),
          el("label", { class: "field" }, "Lowest monthly income you could accept", numberInput("minimumAcceptableIncome", { min: 0, step: 1 }), fieldError("err-mai", errors.minimumAcceptableIncome)),
        ),
      ),
      failure ? errorPanel(failure.message, { onRetry: failure.retry, onSample: failure.sample }) : null,
      el("div", { class: "actions split" }, el("a", { href: "#/start", class: "button secondary" }, "Back"), el("button", { type: "submit", class: "primary" }, "Find my career paths")),
    ),
  );
}

// ---------- C/D. Career explorer + comparison ----------
function skillList(skills) {
  return el(
    "ul",
    { class: "skill-list" },
    skills.map((s) =>
      el(
        "li",
        {},
        el("span", {}, s.skill),
        s.verified
          ? el("details", { class: "quote" }, el("summary", { class: "small" }, "From your résumé"), el("blockquote", {}, "“" + s.evidence + "”"))
          : el("span", { class: "small muted" }, " (AI inference: no matching quote in your résumé)"),
      ),
    ),
  );
}

function careerCard(c) {
  return el(
    "article",
    { class: "career-card" },
    el("div", { class: "row space" }, el("h3", { class: "flush" }, c.title), pill(EFFORT_LABEL[c.relativeEffort], "effort-" + c.relativeEffort)),
    el("p", { class: "small muted flush" }, c.roleSummary),
    el("p", {}, c.fitExplanation),
    el("h4", {}, "Your experience already gives you"),
    c.transferableSkills.length ? skillList(c.transferableSkills) : el("p", { class: "small muted" }, "No clear overlap found."),
    el("h4", {}, "Skills to build"),
    el("ul", {}, c.missingSkills.map((s) => el("li", {}, s))),
    el("p", { class: "tradeoff" }, el("strong", {}, "Trade-off: "), c.keyTradeoff),
    c.assumptions.length ? el("details", {}, el("summary", { class: "small" }, "Assumptions"), el("ul", { class: "small" }, c.assumptions.map((a) => el("li", {}, a)))) : null,
    el("div", { class: "actions" }, el("button", { type: "button", class: "primary", onclick: () => choosePath(c.id) }, "Choose This Path")),
  );
}

function compareTable(careers) {
  const rows = [
    ["Why your experience transfers", (c) => c.fitExplanation],
    ["Skills you already have", (c) => c.transferableSkills.map((s) => s.skill).join(", ") || "—"],
    ["Skills you need to build", (c) => c.missingSkills.join(", ")],
    ["Relative effort", (c) => EFFORT_LABEL[c.relativeEffort]],
    ["Main trade-off", (c) => c.keyTradeoff],
  ];
  return el(
    "div",
    { class: "table-wrap", tabindex: "0", role: "region", "aria-label": "Career path comparison" },
    el(
      "table",
      { class: "compare" },
      el("thead", {}, el("tr", {}, el("th", { scope: "col" }, "Dimension"), careers.map((c) => el("th", { scope: "col" }, c.title)))),
      el(
        "tbody",
        {},
        rows.map(([label, get]) => el("tr", {}, el("th", { scope: "row" }, label), careers.map((c) => el("td", {}, get(c))))),
        el(
          "tr",
          {},
          el("th", { scope: "row" }, ""),
          careers.map((c) => el("td", {}, el("button", { type: "button", class: "secondary", onclick: () => choosePath(c.id) }, `Choose ${c.title}`))),
        ),
      ),
    ),
  );
}

function renderExplore(failure) {
  renderNav("explore");
  if (!saved.recs) {
    return mount(
      app,
      el("section", { class: "card empty" }, el("h2", {}, "No career paths yet"), el("p", { class: "muted" }, "Add your background and constraints to see three realistic paths."), el("div", { class: "actions" }, el("a", { class: "button primary", href: "#/start" }, "Build My Career Roadmap"), el("button", { type: "button", class: "secondary", onclick: startDemo }, "Try Demo"))),
    );
  }
  const { careers, mode } = saved.recs;
  const p = saved.profile;

  const who = memory.ui.explorerEdit
    ? (() => {
        const role = el("input", { type: "text", id: "edit-role", value: p.currentRole });
        const yrs = el("input", { type: "number", id: "edit-years", min: 0, max: 60, value: p.yearsExperience ?? "" });
        return el(
          "form",
          {
            class: "grid2 edit-who",
            onsubmit: (e) => {
              e.preventDefault();
              p.currentRole = role.value.trim() || p.currentRole;
              const y = Number(yrs.value);
              p.yearsExperience = yrs.value === "" || !(y >= 0 && y <= 60) ? null : Math.round(y);
              memory.form.currentRole = p.currentRole;
              memory.form.yearsExperience = p.yearsExperience ?? "";
              memory.ui.explorerEdit = false;
              save();
              renderExplore();
            },
          },
          el("label", { class: "field" }, "Current role", role),
          el("label", { class: "field" }, "Years", yrs),
          el("div", { class: "actions" }, el("button", { type: "submit", class: "primary" }, "Save")),
        );
      })()
    : el(
        "p",
        { class: "who" },
        "We read you as: ",
        el("strong", {}, p.currentRole),
        p.yearsExperience !== null && p.yearsExperience !== undefined ? `, ${p.yearsExperience} years` : "",
        p.industry ? ` · ${p.industry}` : "",
        " ",
        el("button", { type: "button", class: "link", onclick: () => ((memory.ui.explorerEdit = true), renderExplore()) }, "Correct this"),
      );

  const confirm = memory.ui.confirm?.kind === "replace" ? replaceConfirm(memory.ui.confirm.careerId) : null;

  mount(
    app,
    modeBanner(mode),
    stepper(3),
    el(
      "section",
      { class: "intro" },
      el("h1", {}, "You're not starting from zero."),
      el("p", { class: "lead" }, "Here's what your experience already gives you: three paths that build on it. Pick one to get your 30-day roadmap."),
      who,
      saved.recs.profile.evidenceNote ? el("p", { class: "small muted" }, saved.recs.profile.evidenceNote) : null,
    ),
    confirm,
    failure ? errorPanel(failure.message, { onRetry: failure.retry, onSample: failure.sample }) : null,
    el("div", { class: "career-grid" }, careers.map(careerCard)),
    el("h2", {}, "Compare side by side"),
    compareTable(careers),
    el(
      "p",
      { class: "fine" },
      "Recommendations are informational and uncertain, not a guarantee of employment or pay. Bridge does not estimate salaries or durations. Skills marked “From your résumé” were checked by code against your text.",
    ),
    el("div", { class: "actions" }, el("a", { href: "#/start/2", class: "button secondary" }, "Change my answers")),
  );
}

function replaceConfirm(careerId) {
  const c = saved.recs.careers.find((x) => x.id === careerId);
  const pr = progress(saved.roadmap);
  return el(
    "div",
    { class: "confirm", role: "alertdialog", "aria-labelledby": "confirm-title" },
    el("p", { id: "confirm-title", class: "flush" }, el("strong", {}, `Replace your ${saved.roadmap.targetRole} roadmap?`), ` You've completed ${pr.done} of ${pr.total} tasks. A new ${c.title} plan starts fresh; ticks carry over only for identical tasks.`),
    el(
      "div",
      { class: "actions" },
      el("button", { type: "button", class: "primary", onclick: () => ((memory.ui.confirm = null), buildRoadmapFor(careerId, { merge: true })) }, `Yes, switch to ${c.title}`),
      el("button", { type: "button", class: "secondary", onclick: () => ((memory.ui.confirm = null), go("#/roadmap")) }, "Keep my current roadmap"),
    ),
  );
}

function choosePath(careerId) {
  const r = saved.roadmap;
  if (r && r.targetCareerId === careerId && saved.selectedCareerId === careerId) return go("#/roadmap");
  if (r && progress(r).done > 0) {
    memory.ui.confirm = { kind: "replace", careerId };
    renderExplore();
    app.querySelector(".confirm")?.scrollIntoView({ block: "center" });
    return;
  }
  buildRoadmapFor(careerId, { merge: false });
}

async function buildRoadmapFor(careerId, { merge, sample = false, hoursPerWeek, track } = {}) {
  const career = saved.recs.careers.find((c) => c.id === careerId);
  const profile = saved.profile;
  const h = clampHours(hoursPerWeek ?? profile.hoursPerWeek);
  const t = track ?? profile.transitionPreference;
  loading(`Building your 30-day ${career.title} roadmap…`, `Four weeks that fit ${hoursText(h)}. Usually 20–40 seconds.`);
  try {
    const out = await api("/api/roadmap", { profile, career, track: t, hoursPerWeek: h, candidateId: saved.candidateId, sample });
    let roadmap = out.roadmap;
    let kept = 0;
    let lost = 0;
    if (merge && saved.roadmap) ({ roadmap, kept, lost } = mergeProgress(saved.roadmap, roadmap));

    // Practice answers are the user's own work: never drop them for the same
    // role. Matching task ids keep theirs; a practice whose task disappeared
    // moves to the new week-1 practice task (which counts as done if submitted).
    const ids = new Set(allTasks(roadmap).map((x) => x.id));
    const practice = {};
    let orphan = null;
    for (const [id, p] of Object.entries(saved.practice)) {
      if (p.simulation?.targetRole !== roadmap.targetRole) continue;
      if (ids.has(id)) practice[id] = p;
      else if (!orphan || (p.submitted && !orphan.submitted)) orphan = p;
    }
    const quick = roadmap.weeks[0].tasks.find((x) => x.type === "simulation");
    let movedPractice = false;
    if (orphan && quick && !practice[quick.id]) {
      practice[quick.id] = orphan;
      movedPractice = true;
      if (orphan.submitted && !quick.completed) {
        roadmap = setTaskCompleted(roadmap, quick.id, true);
        kept++;
        lost = Math.max(0, lost - 1);
      }
    }
    saved.practice = practice;
    let notice = kept || lost ? `Plan updated. ${kept} completed task${kept === 1 ? "" : "s"} kept${lost ? `, ${lost} reset because the task changed` : ""}.` : "";
    if (movedPractice) notice += " Your practice answer and feedback were kept with the new week-1 practice task.";
    saved.roadmap = roadmap;
    saved.roadmapMode = out.mode;
    saved.selectedCareerId = careerId;
    saved.profile = { ...profile, hoursPerWeek: h, transitionPreference: t };
    memory.ui.notice = notice;
    save();
    go("#/roadmap");
  } catch (err) {
    const retry = () => buildRoadmapFor(careerId, { merge, sample, hoursPerWeek: h, track: t });
    const useSample = () => buildRoadmapFor(careerId, { merge, sample: true, hoursPerWeek: h, track: t });
    if (location.hash === "#/roadmap" && saved.roadmap) renderRoadmap({ message: err.message, retry, sample: useSample });
    else renderExplore({ message: err.message, retry, sample: useSample });
  }
}

// ---------- E. Roadmap (hero) ----------
function toggleTask(taskId, done, focusId) {
  saved.roadmap = setTaskCompleted(saved.roadmap, taskId, done);
  save();
  // Re-render in place: keep the scroll position and the keyboard focus.
  const y = window.scrollY;
  renderRoadmap();
  window.scrollTo(0, y);
  if (focusId) document.getElementById(focusId)?.focus({ preventScroll: true });
}

function taskCard(t) {
  const cbId = `cb-${t.id}`;
  const cb = el("input", { type: "checkbox", id: cbId, checked: t.completed, "aria-describedby": `meta-${t.id}` });
  cb.addEventListener("change", () => toggleTask(t.id, cb.checked, cbId));
  const details = el(
    "details",
    { class: "task-more", open: memory.ui.open.has(t.id) ? true : null },
    el("summary", {}, "How to do it"),
    el("p", {}, el("strong", {}, "Why this matters: "), t.whyThisMatters),
    t.instructions.length ? el("ol", {}, t.instructions.map((s) => el("li", {}, s))) : null,
    el("p", {}, el("strong", {}, "Done when: "), t.successCriteria),
  );
  details.addEventListener("toggle", () => (details.open ? memory.ui.open.add(t.id) : memory.ui.open.delete(t.id)));
  const p = saved.practice[t.id];
  return el(
    "li",
    { class: "task" + (t.completed ? " is-done" : ""), id: `task-${t.id}` },
    el("div", { class: "task-head" }, cb, el("label", { for: cbId, class: "task-title" }, t.title)),
    el(
      "p",
      { id: `meta-${t.id}`, class: "task-meta" },
      pill(TYPE_LABEL[t.type], "type-" + t.type),
      pill(minutes(t.estimatedMinutes), t.estimatedMinutes <= QUICK_TASK_MAX_MIN ? "quick" : ""),
      el("span", {}, el("strong", {}, "Deliverable: "), t.deliverable),
    ),
    details,
    t.type === "simulation"
      ? el(
          "div",
          { class: "actions tight" },
          el("a", { class: "button " + (p?.submitted ? "secondary" : "primary"), href: `#/practice/${encodeURIComponent(t.id)}` }, p?.evaluation ? "View feedback" : p?.answer ? "Continue practice task" : "Start practice task"),
          p?.submitted ? el("a", { class: "button secondary", href: `#/case-study/${encodeURIComponent(t.id)}` }, "Case study") : null,
        )
      : null,
  );
}

function weekCard(w, budget) {
  const status = weekStatus(w);
  return el(
    "section",
    { class: "week card", "aria-labelledby": `wk-${w.week}` },
    el("div", { class: "row space" }, el("h3", { id: `wk-${w.week}`, class: "flush" }, `Week ${w.week} · ${w.title}`), pill(STATUS_LABEL[status], "status-" + status)),
    el("p", { class: "muted flush" }, w.objective),
    el("p", { class: "small muted" }, `${minutes(weekMinutes(w))} planned of your ${minutes(budget)} this week`),
    el("ul", { class: "tasks" }, w.tasks.map(taskCard)),
  );
}

function nextActionCard(r) {
  const next = nextAction(r);
  if (!next) {
    return el(
      "section",
      { class: "card next done-all" },
      el("p", { class: "eyebrow" }, "All done"),
      el("h2", { class: "flush" }, "You finished your first 30 days."),
      el("p", {}, "That's a real start, not the finish. Export your case study, keep the conversations going, or regenerate a plan with new constraints."),
    );
  }
  const t = next.task;
  const quick = t.estimatedMinutes <= QUICK_TASK_MAX_MIN;
  return el(
    "section",
    { class: "card next", "aria-labelledby": "next-title" },
    el("p", { class: "eyebrow" }, quick ? "Your next 10-minute step" : `Next action · Week ${next.week}`),
    el("h2", { id: "next-title", class: "flush" }, t.title),
    el("p", { class: "task-meta" }, pill(minutes(t.estimatedMinutes), quick ? "quick" : ""), pill(TYPE_LABEL[t.type], "type-" + t.type)),
    el("p", {}, el("strong", {}, "You'll produce: "), t.deliverable),
    el("p", { class: "small" }, el("strong", {}, "Done when: "), t.successCriteria),
    el(
      "div",
      { class: "actions" },
      t.type === "simulation"
        ? el("a", { class: "button primary", href: `#/practice/${encodeURIComponent(t.id)}` }, "Start practice task")
        : el(
            "button",
            {
              type: "button",
              class: "primary",
              onclick: () => {
                memory.ui.open.add(t.id);
                renderRoadmap();
                document.getElementById(`task-${t.id}`)?.scrollIntoView({ block: "center" });
                document.getElementById(`cb-${t.id}`)?.focus();
              },
            },
            "Show steps",
          ),
      el("button", { type: "button", class: "secondary", onclick: () => toggleTask(t.id, true) }, "Mark as done"),
    ),
  );
}

function planSettings(r) {
  const hours = el("input", { type: "number", id: "plan-hours", min: MIN_HOURS, max: MAX_HOURS, step: 0.5, value: r.hoursPerWeek });
  const track = el("select", { id: "plan-track" }, TRACKS.map((t) => el("option", { value: t, selected: t === r.track }, TRACK_INFO[t].label)));
  const trackHelp = el("p", { class: "small muted", id: "track-help" }, TRACK_INFO[r.track].summary);
  const warn = el("p", { class: "small warn-text", role: "status" });
  const updateHelp = () => {
    trackHelp.textContent = TRACK_INFO[track.value].summary;
    const budget = saved.profile?.monthlyLearningBudget ?? 0;
    warn.textContent =
      track.value === "fast" && budget === 0
        ? "Fast Track usually means more hours or paid learning. Your budget is 0, so the plan stays on free resources and uses all your weekly hours."
        : track.value === "fast" && Number(hours.value) < 5
          ? "Fast Track with under 5 hours a week is still slow. Consider adding hours if you can."
          : "";
  };
  track.addEventListener("change", updateHelp);
  hours.addEventListener("input", updateHelp);
  updateHelp();
  const err = el("p", { class: "field-error", role: "alert" });
  const pr = progress(r);

  const askRegenerate = () => {
    const h = Number(hours.value);
    if (!(h >= MIN_HOURS && h <= MAX_HOURS)) {
      err.textContent = `Enter between ${MIN_HOURS} and ${MAX_HOURS} hours per week.`;
      return;
    }
    memory.ui.confirm = { kind: "regenerate", hoursPerWeek: h, track: track.value };
    renderRoadmap();
    app.querySelector(".confirm")?.scrollIntoView({ block: "center" });
  };

  return el(
    "details",
    { class: "card settings", open: memory.ui.open.has("settings") ? true : null, ontoggle: (e) => (e.target.open ? memory.ui.open.add("settings") : memory.ui.open.delete("settings")) },
    el("summary", {}, "Change hours or track"),
    el(
      "div",
      { class: "grid2" },
      el("label", { class: "field" }, "Hours per week", hours),
      el("label", { class: "field" }, "Track", track),
    ),
    trackHelp,
    warn,
    err,
    el("div", { class: "actions" }, el("button", { type: "button", class: "secondary", onclick: askRegenerate }, "Regenerate my plan")),
    el("p", { class: "fine" }, pr.done ? `You have ${pr.done} completed task${pr.done === 1 ? "" : "s"}. You'll confirm before anything changes.` : "Your plan is replaced with one that fits the new hours and track."),
  );
}

function regenerateConfirm(r) {
  const c = memory.ui.confirm;
  const pr = progress(r);
  return el(
    "div",
    { class: "confirm", role: "alertdialog", "aria-labelledby": "regen-title" },
    el(
      "p",
      { id: "regen-title", class: "flush" },
      el("strong", {}, `Regenerate for ${hoursText(c.hoursPerWeek)}, ${TRACK_INFO[c.track].label}?`),
      pr.done ? ` This replaces your plan. Your ${pr.done} completed task${pr.done === 1 ? "" : "s"} stay ticked only where the same task appears in the new plan; the rest reset.` : " This replaces your current plan.",
    ),
    el(
      "div",
      { class: "actions" },
      el("button", { type: "button", class: "primary", onclick: () => ((memory.ui.confirm = null), buildRoadmapFor(saved.selectedCareerId, { merge: true, hoursPerWeek: c.hoursPerWeek, track: c.track })) }, "Yes, regenerate"),
      el("button", { type: "button", class: "secondary", onclick: () => ((memory.ui.confirm = null), renderRoadmap()) }, "Cancel"),
    ),
  );
}

function moneyCheck() {
  const cur = saved.profile?.currency ?? "USD";
  const m = memory.money;
  const f = memory.form;
  const out = el("div", { role: "status", "aria-live": "polite" });
  const fields = [
    ["currentMonthlyIncome", "Current monthly income", f],
    ["minimumAcceptableIncome", "Lowest monthly income you could accept", f],
    ["expectedMonthlyIncome", "Expected monthly income in the new role (your own research)", m],
    ["monthsReduced", "Months you expect to earn less", m],
    ["learningMonths", "Months you'll pay for learning", m],
  ];
  const inputs = fields.map(([key, label, src]) => {
    const input = el("input", { type: "number", min: 0, step: 1, id: `m-${key}`, value: src[key] ?? "" });
    input.addEventListener("input", () => ((src[key] = input.value), update()));
    return el("label", { class: "field" }, label, input);
  });
  const fmt = (n) => (cur === "USD" ? money(n) : `${Math.round(n).toLocaleString("en-US")} ${cur}`);
  function update() {
    const budget = saved.profile?.monthlyLearningBudget ?? 0;
    const res = transitionCost({
      learningPerMonth: budget,
      learningMonths: m.learningMonths,
      monthsReduced: m.monthsReduced,
      currentMonthlyIncome: f.currentMonthlyIncome,
      expectedMonthlyIncome: m.expectedMonthlyIncome,
    });
    const facts = [
      `Learning budget: ${fmt(budget)} per month`,
      amount(f.currentMonthlyIncome) !== null ? `Current income: ${fmt(amount(f.currentMonthlyIncome))} per month` : "Current income: not given",
      amount(f.minimumAcceptableIncome) !== null ? `Lowest acceptable income: ${fmt(amount(f.minimumAcceptableIncome))} per month` : "Lowest acceptable income: not given",
      amount(m.expectedMonthlyIncome) !== null ? `Expected new-role income: ${fmt(amount(m.expectedMonthlyIncome))} per month (your estimate)` : "Expected new-role income: unknown",
    ];
    const below = belowMinimum(m.expectedMonthlyIncome, f.minimumAcceptableIncome);
    mount(
      out,
      el("h4", {}, "Your numbers"),
      el("ul", { class: "small" }, facts.map((x) => el("li", {}, x))),
      el("h4", {}, "Scenario estimate"),
      res.ok
        ? el(
            "div",
            {},
            el("p", { class: "estimate" }, el("strong", {}, fmt(res.total))),
            el("p", { class: "small muted" }, `= learning ${fmt(budget)} × ${amount(m.learningMonths)} month(s) + ${amount(m.monthsReduced)} month(s) × ${fmt(res.shortfall)} income shortfall`),
          )
        : el("p", { class: "muted" }, "Not enough information for a meaningful estimate. Missing: " + res.missing.join(", ") + "."),
      below === true ? el("p", { class: "warn" }, "Your expected income is below the lowest income you said you could accept. A staged move (Safe Track) may fit better.") : null,
    );
  }
  update();
  return el(
    "details",
    { class: "card" },
    el("summary", {}, "Money check (optional)"),
    el("p", { class: "small muted" }, "Estimated transition cost = learning expense + (months at reduced income × monthly income shortfall). Uses only numbers you type. Bridge does not know salaries in your area. These numbers stay in this tab and are not saved."),
    el("div", { class: "grid2" }, inputs),
    out,
  );
}

function renderRoadmap(failure) {
  renderNav("roadmap");
  const r = saved.roadmap;
  if (!r) {
    return mount(
      app,
      el(
        "section",
        { class: "card empty" },
        el("h2", {}, "No roadmap yet"),
        el("p", { class: "muted" }, saved.recs ? "Choose one of your career paths to get a 30-day plan." : "Start with your background, or try the demo teacher."),
        el("div", { class: "actions" }, saved.recs ? el("a", { class: "button primary", href: "#/explore" }, "See my career paths") : el("a", { class: "button primary", href: "#/start" }, "Build My Career Roadmap"), saved.recs ? null : el("button", { type: "button", class: "secondary", onclick: startDemo }, "Try Demo")),
      ),
    );
  }
  const pr = progress(r);
  const budget = r.hoursPerWeek * 60;
  const notice = memory.ui.notice;
  memory.ui.notice = "";
  const career = selectedCareer();

  mount(
    app,
    modeBanner(saved.roadmapMode),
    notice ? el("p", { class: "callout", role: "status" }, notice) : null,
    failure ? errorPanel(failure.message, { onRetry: failure.retry, onSample: failure.sample }) : null,
    el(
      "section",
      { class: "card roadmap-head" },
      el("p", { class: "eyebrow" }, "My career roadmap"),
      el("h1", { class: "flush route" }, el("span", {}, r.currentRole), el("span", { class: "arrow", "aria-label": "to" }, " → "), el("span", {}, r.targetRole)),
      el("p", { class: "muted" }, `Your first 30 days · ${hoursText(r.hoursPerWeek)} · ${TRACK_INFO[r.track].label}`),
      el(
        "div",
        { class: "progress", role: "progressbar", "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": pr.percent, "aria-label": "Roadmap progress" },
        el("div", { class: "bar", style: `width:${pr.percent}%` }),
      ),
      el("p", { class: "progress-text" }, el("strong", {}, `${pr.done} of ${pr.total} tasks done`), ` (${pr.percent}%)`),
      career?.missingSkills?.length ? el("p", { class: "small" }, el("strong", {}, "Skills this plan builds: "), career.missingSkills.join(", ")) : null,
    ),
    memory.ui.confirm?.kind === "regenerate" ? regenerateConfirm(r) : null,
    nextActionCard(r),
    r.weeks.map((w) => weekCard(w, budget)),
    el(
      "section",
      { class: "card" },
      el("h3", { class: "flush" }, "A roadmap, not a promise."),
      el("p", { class: "small muted" }, "30 days is a first step, not a full career switch. No salaries, prices, job listings or hiring dates are included because Bridge cannot verify them."),
      r.assumptions.length ? el("div", {}, el("h4", {}, "Assumptions"), el("ul", { class: "small" }, r.assumptions.map((a) => el("li", {}, a)))) : null,
      r.cautions.length ? el("div", {}, el("h4", {}, "Cautions"), el("ul", { class: "small" }, r.cautions.map((a) => el("li", {}, a)))) : null,
    ),
    planSettings(r),
    moneyCheck(),
    dataControls(),
    el("div", { class: "actions" }, el("a", { href: "#/explore", class: "button secondary" }, "Back to career paths")),
  );
}

function dataControls() {
  const c = memory.ui.confirm?.kind === "reset";
  return el(
    "section",
    { class: "card data" },
    el("h3", { class: "flush" }, "Your saved data"),
    el("p", { class: "small muted" }, "Saved in this browser only: career paths, your roadmap, ticks and practice answers. Not saved: your résumé and any income numbers."),
    c
      ? el(
          "div",
          { class: "confirm", role: "alertdialog", "aria-labelledby": "reset-title" },
          el("p", { id: "reset-title", class: "flush" }, el("strong", {}, "Delete everything Bridge saved in this browser?"), " Your roadmap, progress and practice answers are removed. This cannot be undone."),
          el(
            "div",
            { class: "actions" },
            el("button", { type: "button", class: "danger", onclick: () => (resetAll(), go("#/")) }, "Yes, delete it"),
            el("button", { type: "button", class: "secondary", onclick: () => ((memory.ui.confirm = null), renderRoadmap()) }, "Cancel"),
          ),
        )
      : el("button", { type: "button", class: "secondary", onclick: () => ((memory.ui.confirm = { kind: "reset" }), renderRoadmap(), app.querySelector(".data .confirm")?.scrollIntoView({ block: "center" })) }, "Delete my saved data"),
  );
}

// ---------- F. Practice task (simulation) ----------
function firstPracticeTask() {
  return allTasks(saved.roadmap).find((t) => t.type === "simulation") ?? null;
}

async function loadSimulation(taskId, sample = false) {
  const found = findTask(saved.roadmap, taskId);
  const career = selectedCareer();
  loading("Writing a realistic practice task for you…", "Usually 10–20 seconds.");
  try {
    const out = await api("/api/simulation", { profile: saved.profile, career, task: found.task, sample });
    saved.practice[taskId] = { simulation: out.simulation, mode: out.mode, answer: "", sampleUsed: false, evaluation: null, evalMode: null, attempts: 0, submitted: false, reflection: "" };
    save();
    renderPractice(taskId);
  } catch (err) {
    renderPracticeError(taskId, { message: err.message, retry: () => loadSimulation(taskId, sample), sample: () => loadSimulation(taskId, true) });
  }
}

function renderPracticeError(taskId, failure) {
  mount(
    app,
    el("p", {}, el("a", { href: "#/roadmap" }, "← Back to my roadmap")),
    errorPanel(failure.message, { onRetry: failure.retry, onSample: failure.sample, onBack: () => go("#/roadmap"), backLabel: "Back to my roadmap" }),
  );
}

function scoreBar(score, max) {
  return el(
    "span",
    { class: "score-bar", role: "img", "aria-label": `${score} out of ${max}` },
    Array.from({ length: max }, (_, i) => el("span", { class: "seg" + (i < score ? " on" : "") })),
  );
}

function rubricTable(sim) {
  return el(
    "table",
    { class: "rubric" },
    el("caption", { class: "visually-hidden" }, "Scoring rubric"),
    el("thead", {}, el("tr", {}, el("th", { scope: "col" }, "Criterion"), el("th", { scope: "col" }, "What a strong answer does"), el("th", { scope: "col" }, "Max"))),
    el("tbody", {}, sim.rubric.map((c) => el("tr", {}, el("td", {}, el("strong", {}, c.label)), el("td", {}, c.description), el("td", {}, String(c.maxScore))))),
  );
}

function feedbackView(p) {
  const ev = p.evaluation;
  return el(
    "section",
    { class: "card feedback", "aria-labelledby": "fb-title" },
    modeBanner(p.evalMode),
    el("p", { class: "eyebrow" }, "AI-generated practice feedback"),
    el("h2", { id: "fb-title", class: "flush" }, `${ev.totalScore} of ${ev.maxTotal} points`),
    el("p", { class: "small muted" }, "Practice feedback from an AI against the rubric above. It is not a hiring decision, an employer's assessment or an accreditation."),
    el(
      "ul",
      { class: "criteria" },
      ev.criteria.map((c) =>
        el(
          "li",
          {},
          el("div", { class: "row space" }, el("strong", {}, c.label), el("span", { class: "row tight" }, scoreBar(c.score, c.maxScore), el("span", { class: "small" }, `${c.score}/${c.maxScore}`))),
          c.verified
            ? el("blockquote", {}, "From your answer: “" + c.evidence + "”")
            : el("p", { class: "small warn" }, "No matching quote from your answer was found, so this score is capped at 1."),
          c.strengths.length ? el("p", { class: "small" }, el("strong", {}, "Strengths: "), c.strengths.join(" ")) : null,
          c.improvements.length ? el("p", { class: "small" }, el("strong", {}, "To improve: "), c.improvements.join(" ")) : null,
        ),
      ),
    ),
    ev.overallFeedback ? el("p", {}, ev.overallFeedback) : null,
    ev.nextRevisionStep ? el("p", { class: "callout" }, el("strong", {}, "Next revision step: "), ev.nextRevisionStep) : null,
  );
}

function renderPractice(taskId) {
  renderNav("practice");
  if (!saved.roadmap) return renderRoadmap();
  if (!taskId) {
    const t = firstPracticeTask();
    if (t) return go(`#/practice/${encodeURIComponent(t.id)}`);
    return mount(app, el("section", { class: "card empty" }, el("h2", {}, "No practice task in this plan"), el("a", { class: "button primary", href: "#/roadmap" }, "Back to my roadmap")));
  }
  const found = findTask(saved.roadmap, taskId);
  if (!found || found.task.type !== "simulation") {
    return mount(app, el("section", { class: "card empty" }, el("h2", {}, "That practice task isn't in your current plan"), el("a", { class: "button primary", href: "#/roadmap" }, "Back to my roadmap")));
  }
  const p = saved.practice[taskId];
  if (!p?.simulation) return loadSimulation(taskId);
  const sim = p.simulation;
  const task = found.task;

  const answer = el("textarea", { id: "answer", rows: 10, placeholder: "Write your answer here, as you would at work…", "aria-describedby": "answer-count" });
  answer.value = p.answer;
  const count = el("span", { id: "answer-count", class: "small muted" }, `${wordCount(p.answer)} words`);
  const sampleTag = el("span", {}, p.sampleUsed ? pill("Sample answer: not written by you") : null);
  answer.addEventListener("input", () => {
    p.answer = answer.value;
    if (p.sampleUsed && !answer.value.trim()) p.sampleUsed = false;
    count.textContent = `${wordCount(answer.value)} words`;
    save();
  });
  const status = el("div", { role: "status", "aria-live": "polite" });

  const sampleBtn = el(
    "button",
    {
      type: "button",
      class: "secondary",
      onclick: async () => {
        sampleBtn.disabled = true;
        sampleBtn.textContent = "Writing a sample answer…";
        try {
          const out = await api("/api/simulation/sample-answer", { simulation: sim, profile: saved.profile, sample: p.mode !== "live" });
          p.answer = out.answer;
          p.sampleUsed = true;
          save();
          renderPractice(taskId);
        } catch (err) {
          sampleBtn.disabled = false;
          sampleBtn.textContent = "Fill a sample answer";
          mount(status, el("p", { class: "error" }, err.message));
        }
      },
    },
    "Fill a sample answer",
  );

  async function submit(sample = p.mode !== "live") {
    if (wordCount(p.answer) < 15) {
      mount(status, el("p", { class: "field-error", role: "alert" }, "Write at least a few sentences (15+ words) before submitting."));
      answer.focus();
      return;
    }
    // Submitting completes the roadmap task, whatever the score.
    p.submitted = true;
    p.attempts = (p.attempts ?? 0) + 1;
    saved.roadmap = setTaskCompleted(saved.roadmap, taskId, true);
    save();
    submitBtn.disabled = true;
    submitBtn.textContent = "Getting feedback…";
    mount(status, el("div", { class: "loading-inline" }, el("div", { class: "spinner small-spin", "aria-hidden": "true" }), el("span", {}, "Submitted. Task marked done. Getting AI practice feedback (10–30 seconds)…")));
    try {
      const out = await api("/api/simulation/evaluate", { simulation: sim, answer: p.answer, sample });
      p.evaluation = out.evaluation;
      p.evalMode = out.mode;
      save();
      renderPractice(taskId);
      document.getElementById("fb-title")?.scrollIntoView({ block: "start" });
    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit for practice feedback";
      mount(status, errorPanel(`Your answer is saved and the task is marked done, but feedback failed: ${err.message}`, { onRetry: () => submit(sample), onSample: () => submit(true) }));
    }
  }
  const submitBtn = el("button", { type: "button", class: "primary", onclick: () => submit() }, p.evaluation ? "Resubmit revised answer" : "Submit for practice feedback");

  mount(
    app,
    modeBanner(p.mode),
    el("p", {}, el("a", { href: "#/roadmap" }, "← Back to my roadmap")),
    el(
      "section",
      { class: "card" },
      el("p", { class: "eyebrow" }, `Practice task · Week ${found.week} · ${sim.targetRole}`),
      el("h1", { class: "flush" }, task.title),
      el("p", { class: "task-meta" }, pill(`Timebox: ${sim.timeboxMinutes} min`, "quick"), task.completed ? pill("Task done", "status-completed") : null, p.attempts ? pill(`Attempts: ${p.attempts}`) : null),
      el("h3", {}, "Scenario"),
      el("p", {}, sim.scenario),
      el("h3", {}, "Your brief"),
      el("p", { class: "inputs" }, sim.brief),
      el("h3", {}, "Expected output"),
      el("p", {}, sim.expectedDeliverable),
      el("h3", {}, "How it will be scored"),
      el("p", { class: "small muted" }, "You see the rubric before you write. Feedback uses only this rubric and your answer."),
      rubricTable(sim),
    ),
    el(
      "section",
      { class: "card" },
      el("label", { for: "answer", class: "label flush" }, "Your answer"),
      answer,
      el("div", { class: "row space" }, el("span", {}, count, " ", sampleTag), sampleBtn),
      status,
      el("div", { class: "actions" }, submitBtn, p.submitted ? el("a", { class: "button secondary", href: `#/case-study/${encodeURIComponent(taskId)}` }, "Create case study") : null),
      p.evaluation ? el("p", { class: "fine" }, "Revise your answer above and resubmit as often as you like. Your latest feedback replaces the previous one.") : null,
    ),
    p.evaluation ? feedbackView(p) : null,
    p.evaluation
      ? el(
          "div",
          { class: "actions" },
          el("button", { type: "button", class: "secondary", onclick: () => (answer.focus(), answer.scrollIntoView({ block: "center" })) }, "Revise my answer"),
          el("a", { class: "button primary", href: `#/case-study/${encodeURIComponent(taskId)}` }, "Create case study"),
          el("a", { class: "button secondary", href: "#/roadmap" }, "Back to my roadmap"),
        )
      : null,
  );
}

// ---------- G. Case study (portfolio evidence) ----------
function skillsDemonstrated(ev) {
  return (ev?.criteria ?? []).filter((c) => c.score / c.maxScore >= 0.6).map((c) => c.label);
}

function caseStudyMarkdown(task, p) {
  const sim = p.simulation;
  const ev = p.evaluation;
  const skills = skillsDemonstrated(ev);
  const lines = [
    `# Case study: ${task.title}`,
    "",
    `Practice work sample for: ${sim.targetRole}`,
    "",
    "## The challenge",
    "_Scenario written by Bridge's AI as practice; fictional._",
    "",
    sim.scenario,
    "",
    "## The task",
    sim.brief,
    "",
    `Expected output: ${sim.expectedDeliverable}`,
    "",
    p.sampleUsed ? "## Response (sample answer generated by AI, not written by me)" : "## My response (written by me)",
    "",
    p.answer.trim(),
    "",
  ];
  if (ev) {
    lines.push("## Skills demonstrated", "_From AI-generated practice feedback, not an employer assessment._", "");
    if (skills.length) skills.forEach((s) => lines.push(`- ${s}`));
    else lines.push("- None scored at 60% or more yet.");
    lines.push("", `Practice score: ${ev.totalScore} of ${ev.maxTotal}. Next revision step: ${ev.nextRevisionStep}`, "");
  }
  if (p.reflection?.trim()) lines.push("## My reflection (written by me)", "", p.reflection.trim(), "");
  return lines.join("\n");
}

function renderCaseStudy(taskId) {
  renderNav("practice");
  const found = taskId && saved.roadmap ? findTask(saved.roadmap, taskId) : null;
  const p = found ? saved.practice[taskId] : null;
  if (!found || !p?.submitted) {
    return mount(
      app,
      el(
        "section",
        { class: "card empty" },
        el("h2", {}, "Nothing to turn into a case study yet"),
        el("p", { class: "muted" }, "Submit a practice task first. Your answer becomes a one-page case study you can download or print."),
        el("a", { class: "button primary", href: saved.roadmap ? "#/practice" : "#/start" }, saved.roadmap ? "Go to practice" : "Build My Career Roadmap"),
      ),
    );
  }
  const sim = p.simulation;
  const ev = p.evaluation;
  const skills = skillsDemonstrated(ev);
  const reflection = el("textarea", { id: "reflection", rows: 4, placeholder: "What did you learn? What would you change next time? (Written by you.)" });
  reflection.value = p.reflection ?? "";
  const reflectionPrint = el("p", { class: "print-only" }, p.reflection ?? "");
  reflection.addEventListener("input", () => {
    p.reflection = reflection.value;
    reflectionPrint.textContent = reflection.value;
    save();
  });

  const download = () => {
    const blob = new Blob([caseStudyMarkdown(found.task, p)], { type: "text/markdown" });
    const a = el("a", { href: URL.createObjectURL(blob), download: `bridge-case-study-${taskId}.md` });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  mount(
    app,
    el("p", { class: "no-print" }, el("a", { href: `#/practice/${encodeURIComponent(taskId)}` }, "← Back to the practice task")),
    el(
      "article",
      { class: "card case-study" },
      el("p", { class: "eyebrow" }, `Practice work sample · ${sim.targetRole}`),
      el("h1", { class: "flush" }, `Case study: ${found.task.title}`),
      el("h2", {}, "The challenge"),
      el("p", { class: "small muted" }, "Scenario written by Bridge's AI as practice; fictional."),
      el("p", {}, sim.scenario),
      el("h2", {}, "The task"),
      el("p", {}, sim.brief),
      el("p", {}, el("strong", {}, "Expected output: "), sim.expectedDeliverable),
      el("h2", {}, p.sampleUsed ? "Response" : "My response"),
      el("p", { class: "authored" }, p.sampleUsed ? pill("Sample answer generated by AI: not written by me") : pill("Written by me")),
      el("pre", { class: "answer" }, p.answer),
      ev
        ? el(
            "div",
            {},
            el("h2", {}, "Skills demonstrated"),
            el("p", { class: "small muted" }, "From AI-generated practice feedback, not an employer assessment."),
            skills.length ? el("ul", {}, skills.map((s) => el("li", {}, s))) : el("p", {}, "None scored at 60% or more yet."),
            el("p", { class: "small" }, `Practice score: ${ev.totalScore} of ${ev.maxTotal}.`),
          )
        : el("p", { class: "small muted" }, "No feedback yet. You can still export your work."),
      el("h2", {}, "My reflection"),
      el("label", { for: "reflection", class: "visually-hidden" }, "My reflection"),
      el("div", { class: "no-print" }, reflection),
      reflectionPrint,
    ),
    el(
      "div",
      { class: "actions no-print" },
      el("button", { type: "button", class: "primary", onclick: download }, "Download as Markdown"),
      el("button", { type: "button", class: "secondary", onclick: () => window.print() }, "Print or save as PDF"),
      el("a", { class: "button secondary", href: "#/roadmap" }, "Back to my roadmap"),
    ),
    el("p", { class: "fine no-print" }, "Contains only the practice task, your answer and your reflection: no résumé text, income or contact details. Nothing is uploaded or published; there is no public link."),
  );
}

// ---------- boot ----------
(async () => {
  try {
    config = await api("/api/config");
  } catch (err) {
    mount(app, el("div", { class: "error", role: "alert" }, "Could not load Bridge: " + err.message, el("div", { class: "actions" }, el("button", { type: "button", class: "primary", onclick: () => location.reload() }, "Try again"))));
    return;
  }
  load();
  if (saved.profile) {
    // Bring back the non-sensitive answers so "Change my answers" is prefilled.
    memory.form = { ...emptyForm(), ...saved.profile, interestedRoles: (saved.profile.interestedRoles ?? []).join(", "), yearsExperience: saved.profile.yearsExperience ?? "" };
  }
  window.addEventListener("hashchange", route);
  route();
})();
