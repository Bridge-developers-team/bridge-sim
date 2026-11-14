// Main flow:
// 1. Who are you? (career changer or recent graduate)
// 2. Your profile (resume / degree, thesis, courses) + what you're curious about
// 3. Bridge Map: verified skills + ranked roles (fit computed in code)
// 4. Three work tasks for the chosen role
// 5. Grading -> portfolio page (state in the link)
import { el, clear, mount, api, wordCount, demoBanner } from "/ui.js";
import { encodeState } from "/lib/shareState.js";

const app = document.getElementById("app");
const DRAFT_KEY = "bridge-sim-draft-v2";

const TRACKS = {
  changer: {
    label: "I'm working and want to change careers",
    short: "Career changer",
    sub: "You've thought about switching for a while, but don't know which field.",
    profileHelp: "Paste your resume. Every task will be set in the industry you already know.",
    placeholder: "Paste your resume or LinkedIn experience here…",
  },
  graduate: {
    label: "I'm a recent graduate looking for my field",
    short: "Recent graduate",
    sub: "You have a degree, but can't find work in it, or want to point it somewhere new.",
    profileHelp:
      "Paste your resume, or write it out: degree and major, thesis or capstone (what you studied and which methods you used), key courses, research or lab work, jobs since graduating, tools you know.",
    placeholder:
      "B.A. Political Science, 2026. Thesis: … (method: regression in R)\nCourses: …\nResearch assistant: …\nSince graduating: …\nTools: Excel, R, Python…",
  },
};

const state = {
  config: null,
  step: "track", // track | profile | map | tasks
  track: null,
  resume: "",
  interests: "",
  map: null, // { person, hiddenStrength, skills, ranking, mode }
  roleId: null,
  sim: null, // { profile, tasks, roleId, mode }
  answers: ["", "", ""],
  demoUsed: [false, false, false],
  active: 0,
  showAllRoles: false,
};

// Draft lives only in this browser tab (sessionStorage), so going back to the
// map or reloading does not lose work. Nothing is sent to our server.
function saveDraft() {
  try {
    const { config, ...rest } = state;
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(rest));
  } catch {
    /* storage blocked: draft is a convenience only */
  }
}

function loadDraft() {
  try {
    const d = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "null");
    if (d && typeof d === "object") Object.assign(state, d);
  } catch {
    /* ignore */
  }
}

function go(step) {
  state.step = step;
  saveDraft();
  render();
  window.scrollTo(0, 0);
}

function errorBox(message) {
  return el("div", { class: "error", role: "alert" }, message);
}

function role(id) {
  return state.config.roles.find((r) => r.id === id);
}

function skillName(id) {
  return state.config.skills.find((s) => s.id === id)?.name ?? id;
}

function dots(level, max) {
  return el(
    "span",
    { class: "dots", "aria-label": `level ${level} of ${max}` },
    Array.from({ length: max }, (_, n) => el("span", { class: "dot" + (n < level ? " on" : "") })),
  );
}

function steps(current) {
  const names = [
    ["track", "You"],
    ["profile", "Profile"],
    ["map", "Bridge Map"],
    ["tasks", "Test-drive"],
  ];
  const idx = names.findIndex(([k]) => k === current);
  return el(
    "ol",
    { class: "steps", "aria-label": "Progress" },
    names.map(([k, label], i) => el("li", { class: i < idx ? "done" : i === idx ? "now" : "", "aria-current": i === idx ? "step" : null }, label)),
  );
}

function render(errorMsg) {
  const views = { track: renderTrack, profile: renderProfile, map: renderMap, tasks: renderTasks };
  (views[state.step] ?? renderTrack)(errorMsg);
}

// ---------- 1. Track ----------
function renderTrack() {
  mount(app, 
    demoBanner(state.config.mode) ?? "",
    el(
      "section",
      { class: "hero" },
      el("h1", {}, "Don't guess your next career. Try it."),
      el(
        "p",
        { class: "lead" },
        "See which jobs your experience or degree already fits, then test-drive one with three real work tasks built from your background. A hiring-manager rubric grades your work and shows why. You leave with a portfolio page, resume lines and an honest plan.",
      ),
    ),
    steps("track"),
    el(
      "div",
      { class: "track-grid" },
      Object.entries(TRACKS).map(([id, t]) =>
        el(
          "button",
          {
            type: "button",
            class: "track-card",
            onclick: () => {
              if (state.track !== id) {
                state.resume = "";
                state.interests = "";
                state.map = null;
              }
              state.track = id;
              go("profile");
            },
          },
          el("strong", {}, t.label),
          el("span", {}, t.sub),
        ),
      ),
    ),
  );
}

// ---------- 2. Profile ----------
function renderProfile(errorMsg) {
  const t = TRACKS[state.track];
  const textarea = el("textarea", { id: "resume", rows: 13, placeholder: t.placeholder, "aria-describedby": "resume-help" });
  textarea.value = state.resume;
  textarea.addEventListener("input", () => {
    state.resume = textarea.value;
    saveDraft();
  });
  const interests = el("input", {
    type: "text",
    id: "interests",
    placeholder: state.track === "graduate" ? "e.g. finance or machine learning" : "e.g. something with data, or training people",
  });
  interests.value = state.interests;
  interests.addEventListener("input", () => {
    state.interests = interests.value;
    saveDraft();
  });

  const samples = state.config.samples.filter((s) => s.track === state.track);
  const submit = el("button", { type: "submit", class: "primary" }, "Map my skills");

  mount(app, 
    demoBanner(state.config.mode) ?? "",
    steps("profile"),
    el(
      "form",
      {
        class: "card",
        onsubmit: async (e) => {
          e.preventDefault();
          if (state.resume.trim().length < 80) return renderProfile("Add a bit more about yourself (a few lines at least).");
          renderLoading("Reading your profile and checking every skill against your own words…", "Usually 10–30 seconds.");
          try {
            state.map = await api("/api/map", { resume: state.resume, track: state.track, interests: state.interests });
            state.showAllRoles = false;
            go("map");
          } catch (err) {
            renderProfile(err.message);
          }
        },
      },
      el("p", { class: "eyebrow" }, t.short),
      el("h2", {}, state.track === "graduate" ? "What did you study and do?" : "What do you do now?"),
      el("p", { id: "resume-help", class: "muted" }, t.profileHelp),
      el(
        "div",
        { class: "chips" },
        el("span", { class: "muted" }, "Try a sample: "),
        samples.map((s) =>
          el(
            "button",
            {
              type: "button",
              class: "chip",
              onclick: () => {
                state.resume = s.resume;
                state.interests = s.interests;
                saveDraft();
                renderProfile();
              },
            },
            s.label,
          ),
        ),
      ),
      textarea,
      el("label", { for: "interests", class: "label" }, "Anything you're curious about? (optional)"),
      interests,
      errorMsg ? errorBox(errorMsg) : null,
      el("div", { class: "actions split" }, el("button", { type: "button", class: "secondary", onclick: () => go("track") }, "Back"), submit),
      el("p", { class: "fine" }, "Your text goes to the AI only to read your skills and write tasks. Bridge Sim does not save it on a server."),
    ),
  );
}

// ---------- 3. Bridge Map ----------
function renderMap(errorMsg) {
  const { person, hiddenStrength, skills, ranking } = state.map;
  const levels = state.config.skillLevels;
  const shown = state.showAllRoles ? ranking : ranking.slice(0, 5);

  const skillList = skills.length
    ? el(
        "ul",
        { class: "skills" },
        skills.map((s) =>
          el(
            "li",
            {},
            el("div", { class: "row space" }, el("strong", {}, skillName(s.id)), el("span", { class: "row tight" }, dots(s.level, 3), el("span", { class: "small muted" }, levels[s.level]))),
            s.verified
              ? el("blockquote", {}, "“" + s.evidence + "”")
              : el("div", { class: "warn small" }, "The AI's quote was not found in your text, so this counts only as level 1."),
          ),
        ),
      )
    : el("p", { class: "muted" }, "No clear skills found. Add more detail about projects, courses or work.");

  const roleCards = shown.map((r) => {
    const info = role(r.roleId);
    return el(
      "article",
      { class: "role-card" },
      el(
        "div",
        { class: "row space" },
        el("div", {}, el("h3", { class: "flush" }, info.title), el("p", { class: "small muted flush" }, info.blurb)),
        el("div", { class: "fit" }, el("strong", {}, `${r.fit}%`), el("span", {}, "fit today")),
      ),
      r.curious ? el("span", { class: "pill" }, "Matches what you're curious about") : null,
      el(
        "div",
        { class: "cols tight-cols" },
        el(
          "div",
          {},
          el("h4", {}, "You already have"),
          r.matched.length ? el("ul", {}, r.matched.map((m) => el("li", {}, skillName(m.skill)))) : el("p", { class: "small muted" }, "Nothing at the required level yet"),
        ),
        el(
          "div",
          {},
          el("h4", {}, `To build (≈${r.gapHours} h)`),
          r.gaps.length
            ? el("ul", {}, r.gaps.map((g) => el("li", {}, `${skillName(g.skill)}: level ${g.have} → ${g.need}`)))
            : el("p", { class: "small muted" }, "No gaps on paper. Test whether you can do the work."),
        ),
      ),
      el(
        "div",
        { class: "actions" },
        el(
          "button",
          {
            type: "button",
            class: "primary",
            onclick: () => startTasks(r.roleId),
          },
          "Test-drive this role",
        ),
      ),
    );
  });

  mount(app, 
    demoBanner(state.map.mode) ?? "",
    steps("map"),
    el(
      "section",
      { class: "card" },
      el("p", { class: "eyebrow" }, "Your Bridge Map"),
      el("h2", { class: "flush" }, person.situation),
      el("p", { class: "muted" }, person.field),
      hiddenStrength ? el("p", { class: "callout" }, el("strong", {}, "Strength you may undersell: "), hiddenStrength) : null,
      el("details", { open: skills.length <= 4 }, el("summary", {}, `Skills found in your own words (${skills.length})`), skillList),
      el(
        "p",
        { class: "fine" },
        "The AI picks skills from a fixed list and must quote your text. Code checks every quote; unproven claims count only as level 1. Fit is computed in code from each role's entry-level needs.",
      ),
    ),
    el("h2", {}, "Where your background already reaches"),
    errorMsg ? errorBox(errorMsg) : null,
    ...roleCards,
    !state.showAllRoles && ranking.length > 5
      ? el("button", { type: "button", class: "secondary", onclick: () => ((state.showAllRoles = true), renderMap()) }, `Show all ${ranking.length} roles`)
      : null,
    el("div", { class: "actions" }, el("button", { type: "button", class: "secondary", onclick: () => go("profile") }, "Edit my profile")),
  );
}

async function startTasks(roleId) {
  state.roleId = roleId;
  renderLoading(`Writing 3 ${role(roleId).title} tasks built from your background…`, "Usually 20–60 seconds.");
  try {
    state.sim = await api("/api/tasks", {
      resume: state.resume,
      track: state.track,
      roleId,
      skills: state.map.skills,
      person: state.map.person,
    });
    state.answers = ["", "", ""];
    state.demoUsed = [false, false, false];
    state.active = 0;
    go("tasks");
  } catch (err) {
    renderMap(err.message);
  }
}

function renderLoading(message, sub) {
  mount(app, 
    el("div", { class: "card loading", role: "status" }, el("div", { class: "spinner", "aria-hidden": "true" }), el("p", {}, message), sub ? el("p", { class: "muted" }, sub) : null),
  );
}

// ---------- 4. Tasks ----------
function renderTasks(errorMsg) {
  const { profile, tasks, mode } = state.sim;
  const i = state.active;
  const task = tasks[i];
  const info = role(state.sim.roleId);

  const tabs = el(
    "div",
    { class: "tabs", role: "tablist" },
    tasks.map((t, k) =>
      el(
        "button",
        {
          type: "button",
          role: "tab",
          class: "tab" + (k === i ? " active" : ""),
          "aria-selected": k === i ? "true" : "false",
          onclick: () => {
            state.active = k;
            saveDraft();
            renderTasks();
          },
        },
        `Task ${k + 1}`,
        wordCount(state.answers[k]) >= 15 ? el("span", { class: "done", "aria-label": "answered" }, " ✓") : null,
      ),
    ),
  );

  const answer = el("textarea", { rows: 12, id: "answer", placeholder: "Write your answer here, as you would at work…", "aria-label": "Your answer" });
  answer.value = state.answers[i];
  const counter = el("span", { class: "muted" }, `${wordCount(answer.value)} words`);
  answer.addEventListener("input", () => {
    state.answers[i] = answer.value;
    state.demoUsed[i] = state.demoUsed[i] && answer.value.length > 0;
    counter.textContent = `${wordCount(answer.value)} words`;
    saveDraft();
  });

  const demoBtn = el(
    "button",
    {
      type: "button",
      class: "secondary",
      onclick: async () => {
        demoBtn.disabled = true;
        demoBtn.textContent = "Writing a sample answer…";
        try {
          const out = await api("/api/demo-answer", { roleId: state.sim.roleId, task, profile });
          state.answers[i] = out.answer;
          state.demoUsed[i] = true;
          saveDraft();
          renderTasks();
        } catch (err) {
          renderTasks(err.message);
        }
      },
    },
    "Fill a sample answer (for a quick demo)",
  );

  const answeredCount = state.answers.filter((a) => wordCount(a) >= 15).length;
  const gradeBtn = el(
    "button",
    { type: "button", class: "primary", disabled: answeredCount === 0, onclick: gradeAll },
    answeredCount === 3 ? "Grade my 3 answers" : `Grade ${answeredCount} answered task${answeredCount === 1 ? "" : "s"}`,
  );

  mount(app, 
    demoBanner(mode) ?? "",
    steps("tasks"),
    el(
      "section",
      { class: "card profile" },
      el("h2", {}, `Your test-drive: ${info.title}`),
      el("p", { class: "muted" }, `Built from your background as ${profile.currentRole} (${profile.industry}).`),
      el(
        "div",
        { class: "cols" },
        el("div", {}, el("h3", {}, "Carries over"), el("ul", {}, profile.transferableSkills.map((s) => el("li", {}, s)))),
        el("div", {}, el("h3", {}, "To test"), el("ul", {}, profile.gaps.map((s) => el("li", {}, s)))),
      ),
    ),
    tabs,
    el(
      "section",
      { class: "card task", role: "tabpanel" },
      el("p", { class: "eyebrow" }, `Task ${i + 1} of 3 · about ${task.timeMinutes} min`),
      el("h2", {}, task.title),
      el("p", {}, task.scenario),
      el("h3", {}, "What you have"),
      el("p", { class: "inputs" }, task.inputs),
      el("h3", {}, "What to hand in"),
      el("p", {}, task.deliverable),
      el("p", { class: "muted small" }, "Builds on: " + task.buildsOn),
      el("label", { for: "answer", class: "label" }, "Your answer"),
      answer,
      el("div", { class: "row" }, counter, state.demoUsed[i] ? el("span", { class: "pill" }, "Sample answer: edit it or keep it") : null),
      errorMsg ? errorBox(errorMsg) : null,
      el(
        "div",
        { class: "actions split" },
        demoBtn,
        el(
          "div",
          { class: "row" },
          i < 2 ? el("button", { type: "button", class: "secondary", onclick: () => ((state.active = i + 1), saveDraft(), renderTasks()) }, "Next task") : null,
          gradeBtn,
        ),
      ),
    ),
    el("p", { class: "fine" }, el("a", { href: "#", onclick: (e) => (e.preventDefault(), go("map")) }, "Back to my Bridge Map (pick another role)")),
  );
}

// ---------- 5. Grade -> portfolio ----------
async function gradeAll() {
  const { tasks, profile, roleId, mode } = state.sim;
  const todo = tasks.map((t, k) => ({ t, k })).filter(({ k }) => wordCount(state.answers[k]) >= 15);
  renderLoading(`Grading ${todo.length} answer${todo.length === 1 ? "" : "s"} against the hiring-manager rubric…`, "Usually 20–60 seconds.");
  try {
    const grades = await Promise.all(todo.map(({ t, k }) => api("/api/grade", { roleId, task: t, answer: state.answers[k], profile })));
    const byIndex = new Map(todo.map(({ k }, n) => [k, grades[n]]));
    const fitEntry = state.map.ranking.find((r) => r.roleId === roleId);
    const share = {
      v: 2,
      mode,
      track: state.track,
      roleId,
      createdAt: new Date().toISOString().slice(0, 10),
      profile,
      person: state.map.person,
      // Verified skills only (no resume text in the link).
      skills: state.map.skills.map((s) => ({ id: s.id, level: s.level, verified: s.verified, evidence: s.verified ? s.evidence : "" })),
      fit: fitEntry ? { fit: fitEntry.fit, gaps: fitEntry.gaps, gapHours: fitEntry.gapHours, matched: fitEntry.matched } : null,
      tasks: tasks.map((t, k) => {
        const g = byIndex.get(k);
        return {
          ...t,
          answer: state.answers[k],
          sampleAnswer: state.demoUsed[k],
          grade: g
            ? {
                // Raw grader output; the portfolio page recomputes the score in code.
                criteria: g.criteria.map((c) => ({ id: c.id, level: c.levelRaw, evidence: c.evidence, reason: c.reason })),
                strength: g.strength,
                topFix: g.topFix,
                resumeBullet: g.resumeBullet,
              }
            : null,
        };
      }),
      plan: { salary: state.track === "graduate" ? 0 : null, hours: 10 },
    };
    const token = await encodeState(share);
    saveDraft();
    location.href = "/p.html#" + token;
  } catch (err) {
    renderTasks("Grading failed: " + err.message);
  }
}

// ---------- boot ----------
(async () => {
  try {
    state.config = await api("/api/config");
  } catch (err) {
    mount(app, errorBox("Could not load the app: " + err.message));
    return;
  }
  loadDraft();
  if (new URLSearchParams(location.search).get("step") === "map" && state.map) state.step = "map";
  if (state.step === "tasks" && !state.sim?.tasks?.length) state.step = "map";
  if (state.step === "map" && !state.map) state.step = state.track ? "profile" : "track";
  if (state.step === "profile" && !state.track) state.step = "track";
  render();
})();
