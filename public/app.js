// Start flow: resume + role -> 3 tasks -> answers -> grading -> portfolio link.
import { el, clear, api, wordCount, demoBanner } from "/ui.js";
import { encodeState } from "/lib/shareState.js";

const app = document.getElementById("app");
const DRAFT_KEY = "bridge-sim-draft";

const state = {
  config: null,
  resume: "",
  roleId: null,
  sim: null, // { profile, tasks, roleId, mode }
  answers: ["", "", ""],
  demoUsed: [false, false, false],
  active: 0,
};

function saveDraft() {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ sim: state.sim, answers: state.answers, demoUsed: state.demoUsed }));
  } catch {
    /* storage blocked: draft is a convenience only */
  }
}

function loadDraft() {
  try {
    const d = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "null");
    if (d?.sim?.tasks?.length === 3) Object.assign(state, d);
  } catch {
    /* ignore */
  }
}

function errorBox(message) {
  return el("div", { class: "error", role: "alert" }, message);
}

// ---------- Step 1: start ----------
function renderStart(errorMsg) {
  const { roles, samples, mode } = state.config;
  const textarea = el("textarea", {
    id: "resume",
    rows: 12,
    placeholder: "Paste your resume or LinkedIn experience here…",
    "aria-describedby": "resume-help",
  });
  textarea.value = state.resume;
  textarea.addEventListener("input", () => (state.resume = textarea.value));

  const roleList = el(
    "div",
    { class: "roles", role: "radiogroup", "aria-label": "Target role" },
    roles.map((r) =>
      el(
        "label",
        { class: "role" + (state.roleId === r.id ? " selected" : "") },
        el("input", {
          type: "radio",
          name: "role",
          value: r.id,
          checked: state.roleId === r.id,
          onchange: () => {
            state.roleId = r.id;
            renderStart();
          },
        }),
        el("span", { class: "role-title" }, r.title),
        el("span", { class: "role-blurb" }, r.blurb),
        el("span", { class: "role-from" }, "Often from: " + r.commonFrom.join(", ")),
      ),
    ),
  );

  const sampleButtons = el(
    "div",
    { class: "chips" },
    el("span", { class: "muted" }, "No resume handy? "),
    samples.map((s) =>
      el(
        "button",
        {
          type: "button",
          class: "chip",
          onclick: () => {
            state.resume = s.resume;
            state.roleId = s.suggestedRole;
            renderStart();
          },
        },
        s.label,
      ),
    ),
  );

  const go = el("button", { type: "submit", class: "primary" }, "Build my 3 tasks");

  const form = el(
    "form",
    {
      class: "card",
      onsubmit: async (e) => {
        e.preventDefault();
        if (!state.roleId) return renderStart("Pick a target role first.");
        if (state.resume.trim().length < 80) return renderStart("Paste a bit more of your resume (a few lines at least).");
        renderLoading("Reading your background and writing 3 tasks for " + roleTitle() + "…", "Usually 20–60 seconds.");
        try {
          state.sim = await api("/api/tasks", { resume: state.resume, roleId: state.roleId });
          state.answers = ["", "", ""];
          state.demoUsed = [false, false, false];
          state.active = 0;
          saveDraft();
          renderTasks();
        } catch (err) {
          renderStart(err.message);
        }
      },
    },
    el("h2", {}, "1. Who are you now?"),
    el("p", { id: "resume-help", class: "muted" }, "Paste your resume. We use it to set every task in the industry you already know."),
    sampleButtons,
    textarea,
    el("h2", {}, "2. Which job do you want to test-drive?"),
    roleList,
    errorMsg ? errorBox(errorMsg) : null,
    el("div", { class: "actions" }, go),
    el("p", { class: "fine" }, "Your resume goes to the AI only to write your tasks. Bridge Sim does not save it."),
  );

  clear(app).append(
    demoBanner(mode) ?? "",
    el(
      "section",
      { class: "hero" },
      el("h1", {}, "Don't guess your next career. Try it."),
      el(
        "p",
        { class: "lead" },
        "Three real work tasks for the job you're curious about, built from your own background. A hiring-manager rubric grades your work and shows why. You leave with a portfolio page and an honest switch-cost plan.",
      ),
    ),
    form,
  );
}

function roleTitle() {
  return state.config.roles.find((r) => r.id === (state.sim?.roleId ?? state.roleId))?.title ?? "";
}

function renderLoading(message, sub) {
  clear(app).append(
    el("div", { class: "card loading", role: "status" }, el("div", { class: "spinner", "aria-hidden": "true" }), el("p", {}, message), sub ? el("p", { class: "muted" }, sub) : null),
  );
}

// ---------- Step 2: tasks ----------
function renderTasks(errorMsg) {
  const { profile, tasks, mode } = state.sim;
  const i = state.active;
  const task = tasks[i];

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

  clear(app).append(
    demoBanner(mode) ?? "",
    el(
      "section",
      { class: "card profile" },
      el("h2", {}, `Your test-drive: ${roleTitle()}`),
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
      el("p", { class: "muted small" }, "Why this task: " + task.buildsOn),
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
          i < 2
            ? el("button", { type: "button", class: "secondary", onclick: () => ((state.active = i + 1), renderTasks()) }, "Next task")
            : null,
          gradeBtn,
        ),
      ),
    ),
    el(
      "p",
      { class: "fine" },
      el("a", { href: "#", onclick: (e) => (e.preventDefault(), startOver()) }, "Start over with a different resume or role"),
    ),
  );
}

function startOver() {
  state.sim = null;
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
  renderStart();
}

// ---------- Step 3: grade ----------
async function gradeAll() {
  const { tasks, profile, roleId, mode } = state.sim;
  const todo = tasks.map((t, k) => ({ t, k })).filter(({ k }) => wordCount(state.answers[k]) >= 15);
  renderLoading(`Grading ${todo.length} answer${todo.length === 1 ? "" : "s"} against the hiring-manager rubric…`, "Usually 20–60 seconds.");
  try {
    const grades = await Promise.all(
      todo.map(({ t, k }) => api("/api/grade", { roleId, task: t, answer: state.answers[k], profile })),
    );
    const byIndex = new Map(todo.map(({ k }, n) => [k, grades[n]]));
    const share = {
      v: 1,
      mode,
      roleId,
      createdAt: new Date().toISOString().slice(0, 10),
      profile,
      tasks: tasks.map((t, k) => {
        const g = byIndex.get(k);
        return {
          ...t,
          answer: state.answers[k],
          sampleAnswer: state.demoUsed[k],
          grade: g
            ? {
                // Keep raw grader output; the portfolio page recomputes the score in code.
                criteria: g.criteria.map((c) => ({ id: c.id, level: c.levelRaw, evidence: c.evidence, reason: c.reason })),
                strength: g.strength,
                topFix: g.topFix,
              }
            : null,
        };
      }),
      plan: { salary: null, hours: 8 },
    };
    const token = await encodeState(share);
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
    clear(app).append(errorBox("Could not load the app: " + err.message));
    return;
  }
  loadDraft();
  if (state.sim) renderTasks();
  else renderStart();
})();
