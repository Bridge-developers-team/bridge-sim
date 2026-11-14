// Portfolio page: decodes the #hash, recomputes scores in code, shows the
// rubric evidence and the switch-cost plan. Nothing is fetched except role data.
import { el, clear, api, money, demoBanner } from "/ui.js";
import { decodeState, encodeState } from "/lib/shareState.js";
import { scoreTask, overallScore, bandFor } from "/lib/scoring.js";
import { planSwitch } from "/lib/switchCost.js";
import { RUBRIC } from "/lib/rubric.js";

const app = document.getElementById("app");
let data = null;
let role = null;

function levelDots(level) {
  return el(
    "span",
    { class: "dots", "aria-label": `level ${level} of 4` },
    [0, 1, 2, 3].map((n) => el("span", { class: "dot" + (n < level ? " on" : "") })),
  );
}

function bandClass(score) {
  if (score >= 80) return "b4";
  if (score >= 60) return "b3";
  if (score >= 40) return "b2";
  return "b1";
}

function taskCard(task, k) {
  if (!task.grade) {
    return el("section", { class: "card" }, el("p", { class: "eyebrow" }, `Task ${k + 1}`), el("h3", {}, task.title), el("p", { class: "muted" }, "Not attempted."));
  }
  const scored = scoreTask(task.answer, task.grade.criteria);
  return el(
    "section",
    { class: "card" },
    el(
      "div",
      { class: "row space" },
      el("div", {}, el("p", { class: "eyebrow" }, `Task ${k + 1}`), el("h3", { class: "flush" }, task.title)),
      el("div", { class: "score " + bandClass(scored.score) }, el("strong", {}, String(scored.score)), el("span", {}, scored.band)),
    ),
    task.sampleAnswer ? el("p", { class: "pill" }, "Answer started from an AI sample") : null,
    el(
      "table",
      { class: "rubric" },
      el("thead", {}, el("tr", {}, el("th", {}, "Criterion"), el("th", {}, "Level"), el("th", {}, "Why"))),
      el(
        "tbody",
        {},
        scored.criteria.map((c) =>
          el(
            "tr",
            {},
            el("td", {}, el("strong", {}, c.name), el("div", { class: "muted small" }, `weight ${Math.round(c.weight * 100)}%`)),
            el("td", {}, levelDots(c.level), el("div", { class: "small" }, `${c.level}/4`)),
            el(
              "td",
              {},
              el("div", {}, c.descriptor),
              c.evidence && c.verified ? el("blockquote", {}, "“" + c.evidence + "”") : null,
              !c.verified && c.levelRaw > 1
                ? el("div", { class: "warn small" }, `Grader gave ${c.levelRaw}/4 but its quote was not found in the answer, so the level is capped at 1.`)
                : null,
              c.reason ? el("div", { class: "muted small" }, c.reason) : null,
            ),
          ),
        ),
      ),
    ),
    el("div", { class: "cols" }, el("div", {}, el("h4", {}, "Best part"), el("p", {}, task.grade.strength)), el("div", {}, el("h4", {}, "Biggest fix"), el("p", {}, task.grade.topFix))),
    el(
      "details",
      {},
      el("summary", {}, "See the task and answer"),
      el("p", {}, el("strong", {}, "Scenario: "), task.scenario),
      el("p", { class: "inputs" }, el("strong", {}, "Inputs: "), task.inputs),
      el("p", {}, el("strong", {}, "Deliverable: "), task.deliverable),
      el("pre", { class: "answer" }, task.answer),
    ),
  );
}

function planCard(simScore) {
  const salary = el("input", { type: "number", min: 0, step: 1000, inputmode: "numeric", id: "salary", placeholder: "e.g. 58000" });
  const hours = el("input", { type: "number", min: 1, max: 60, step: 1, inputmode: "numeric", id: "hours" });
  salary.value = data.plan?.salary ?? "";
  hours.value = data.plan?.hours ?? 8;
  const out = el("div", { class: "plan-out" });

  async function update() {
    clear(out);
    if (salary.value === "") {
      out.append(el("p", { class: "muted" }, "Enter your current yearly pay to see the plan."));
      return;
    }
    try {
      const p = planSwitch({ role, currentSalary: salary.value, hoursPerWeek: hours.value, simScore });
      out.append(
        el(
          "div",
          { class: "stats" },
          stat(`${p.months} months`, `to get job-ready at ${hours.value} h/week (${p.hoursNeeded} hours)`),
          stat(money(p.courseCost), "course cost"),
          stat(p.firstYearChange < 0 ? money(p.monthlyGap) + "/mo" : "No pay cut", p.firstYearChange < 0 ? "income gap in your first year" : "entry pay is at or above yours"),
          stat(p.breakEvenYears === null ? "Never on pay alone" : p.breakEvenYears === 0 ? "Right away" : `${p.breakEvenYears} years`, "to earn back costs at median pay"),
        ),
        el(
          "p",
          { class: "muted small" },
          `Your sim score (${simScore ?? "none"}) sets learning time to ×${p.multiplier} of the typical ${role.baseHours} hours. ` +
            `Entry pay ${money(role.entryPay)}, median ${money(role.medianPay)}. Courses: ${role.courses.map((c) => `${c.name} ${money(c.price)}${c.billing === "monthly" ? "/mo" : ""}`).join("; ")}.`,
        ),
      );
      data.plan = { salary: Number(salary.value), hours: Number(hours.value) };
      history.replaceState(null, "", "#" + (await encodeState(data)));
    } catch (err) {
      out.append(el("p", { class: "error" }, err.message));
    }
  }
  salary.addEventListener("input", update);
  hours.addEventListener("input", update);
  update();

  return el(
    "section",
    { class: "card" },
    el("h2", {}, "Switch-cost plan"),
    el("p", { class: "muted" }, "What switching would cost you, worked out from your inputs and the role data."),
    !role.verified ? el("p", { class: "warn" }, "Prototype: pay and course figures for this role are sample placeholders, not yet checked against BLS or course pricing pages.") : null,
    el(
      "div",
      { class: "row wrap-row" },
      el("label", { for: "salary", class: "field" }, "Current yearly pay (USD)", salary),
      el("label", { for: "hours", class: "field" }, "Hours per week you can study", hours),
    ),
    out,
  );
}

function stat(big, small) {
  return el("div", { class: "stat" }, el("strong", {}, big), el("span", {}, small));
}

async function render() {
  const scores = data.tasks.filter((t) => t.grade).map((t) => scoreTask(t.answer, t.grade.criteria).score);
  const overall = overallScore(scores);
  const band = overall === null ? null : bandFor(overall);

  const copyBtn = el(
    "button",
    {
      type: "button",
      class: "primary",
      onclick: async () => {
        try {
          await navigator.clipboard.writeText(location.href);
          copyBtn.textContent = "Link copied";
        } catch {
          copyBtn.textContent = "Copy the address bar to share";
        }
      },
    },
    "Copy share link",
  );

  clear(app).append(
    demoBanner(data.mode) ?? "",
    el(
      "section",
      { class: "card hero-card" },
      el("p", { class: "eyebrow" }, `Career test-drive · ${data.createdAt}`),
      el("h1", { class: "flush" }, role.title),
      el("p", { class: "muted" }, `From ${data.profile.currentRole} (${data.profile.industry})`),
      overall !== null
        ? el(
            "div",
            { class: "row overall" },
            el("div", { class: "score big " + bandClass(overall) }, el("strong", {}, String(overall)), el("span", {}, band.label)),
            el("p", {}, band.note, el("br"), el("span", { class: "muted small" }, `Average of ${scores.length} graded task${scores.length === 1 ? "" : "s"}, scored 0–100 with the rubric below.`)),
          )
        : null,
      el(
        "div",
        { class: "cols" },
        el("div", {}, el("h3", {}, "Carries over"), el("ul", {}, data.profile.transferableSkills.map((s) => el("li", {}, s)))),
        el("div", {}, el("h3", {}, "Tested"), el("ul", {}, data.profile.gaps.map((s) => el("li", {}, s)))),
      ),
      el("div", { class: "actions" }, copyBtn, el("a", { class: "secondary button", href: "/" }, "Try another role")),
    ),
    ...data.tasks.map(taskCard),
    planCard(overall),
    el(
      "section",
      { class: "card" },
      el("h2", {}, "How scoring works"),
      el(
        "p",
        { class: "muted" },
        "The AI picks one level (0–4) per criterion and must quote your answer as evidence. Code checks every quote against your answer; a level above 1 without a real quote is capped at 1. The score is the weighted average, computed in code.",
      ),
      RUBRIC.map((c) =>
        el(
          "details",
          {},
          el("summary", {}, `${c.name} (weight ${Math.round(c.weight * 100)}%)`),
          el("ol", { start: 0 }, c.levels.map((l) => el("li", {}, l))),
        ),
      ),
    ),
    el(
      "section",
      { class: "card pricing" },
      el("h2", {}, "Keep going"),
      el(
        "div",
        { class: "cols" },
        el("div", { class: "price" }, el("strong", {}, "$29"), el("span", {}, "One more role test-drive")),
        el("div", { class: "price" }, el("strong", {}, "$79"), el("span", {}, "Three roles + full switch plan")),
      ),
      el("p", { class: "fine" }, "Pricing preview. Payments are not active in this prototype."),
    ),
  );
}

(async () => {
  const token = location.hash.slice(1);
  if (!token) {
    clear(app).append(el("div", { class: "card" }, el("p", {}, "This link has no portfolio in it. "), el("a", { href: "/" }, "Start a test-drive")));
    return;
  }
  try {
    data = await decodeState(token);
    const config = await api("/api/config");
    role = config.roles.find((r) => r.id === data.roleId);
    if (!role) throw new Error("Unknown role in link");
    await render();
  } catch (err) {
    clear(app).append(el("div", { class: "card error" }, "Could not open this portfolio link: " + err.message));
  }
})();
