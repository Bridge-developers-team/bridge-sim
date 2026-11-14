// Portfolio page: decodes the #hash, recomputes scores in code, shows the
// rubric evidence and the switch-cost plan. Nothing is fetched except role data.
import { el, clear, mount, api, money, demoBanner } from "/ui.js";
import { decodeState, encodeState } from "/lib/shareState.js";
import { scoreTask, overallScore, bandFor } from "/lib/scoring.js";
import { planSwitch } from "/lib/switchCost.js";
import { RUBRIC } from "/lib/rubric.js";

const app = document.getElementById("app");
let data = null;
let role = null;
let config = null;

function levelDots(level, max = 4) {
  return el(
    "span",
    { class: "dots", "aria-label": `level ${level} of ${max}` },
    Array.from({ length: max }, (_, n) => el("span", { class: "dot" + (n < level ? " on" : "") })),
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
    task.grade.resumeBullet ? el("p", { class: "callout" }, el("strong", {}, "Resume line: "), task.grade.resumeBullet) : null,
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
  const grad = data.track === "graduate";
  const gapHours = Number.isFinite(data.fit?.gapHours) ? data.fit.gapHours : null;
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
      const p = planSwitch({ role, currentSalary: salary.value, hoursPerWeek: hours.value, simScore, gapHours });
      out.append(
        el(
          "div",
          { class: "stats" },
          stat(p.months === 0 ? "Ready now" : `${p.months} month${p.months === 1 ? "" : "s"}`, `to close your skill gaps at ${hours.value} h/week (${p.hoursNeeded} hours)`),
          stat(money(p.courseCost), "course cost"),
          stat(p.firstYearChange < 0 ? money(p.monthlyGap) + "/mo" : "No pay cut", p.firstYearChange < 0 ? "income gap in your first year" : "entry pay is at or above yours"),
          grad
            ? stat((p.firstYearChange >= 0 ? "+" : "") + money(p.firstYearChange) + "/yr", "first-year pay vs. now, at entry level")
            : stat(p.breakEvenYears === null ? "Never on pay alone" : p.breakEvenYears < 0.1 ? "Within weeks" : `${p.breakEvenYears} years`, "to earn back costs at median pay"),
        ),
        el(
          "p",
          { class: "muted small" },
          (gapHours !== null
            ? `Study hours come from your Bridge Map gaps (${gapHours} h), adjusted ×${p.multiplier} by your sim score (${simScore ?? "none"}). `
            : `Your sim score (${simScore ?? "none"}) sets learning time to ×${p.multiplier} of the typical ${role.baseHours} hours. `) +
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
    el("h2", {}, grad ? "Launch plan" : "Switch-cost plan"),
    el("p", { class: "muted" }, grad ? "Time and money to get job-ready for this role, from your skill gaps and the role data." : "What switching would cost you, worked out from your inputs and the role data."),
    !role.verified ? el("p", { class: "warn" }, "Prototype: pay and course figures for this role are sample placeholders, not yet checked against BLS or course pricing pages.") : null,
    el(
      "div",
      { class: "row wrap-row" },
      el("label", { for: "salary", class: "field" }, grad ? "Current yearly pay (USD, 0 if not working)" : "Current yearly pay (USD)", salary),
      el("label", { for: "hours", class: "field" }, "Hours per week you can study", hours),
    ),
    out,
  );
}

function resumeCard() {
  const bullets = data.tasks.map((t) => t.grade?.resumeBullet).filter((b) => b && !b.startsWith("Demo mode"));
  if (bullets.length === 0) return null;
  const text = bullets.map((b) => "- " + b).join("\n");
  const btn = el(
    "button",
    {
      type: "button",
      class: "secondary",
      onclick: async () => {
        try {
          await navigator.clipboard.writeText(text);
          btn.textContent = "Copied";
        } catch {
          btn.textContent = "Select the text to copy";
        }
      },
    },
    "Copy resume lines",
  );
  return el(
    "section",
    { class: "card" },
    el("h2", {}, "Add to your resume"),
    el("p", { class: "muted" }, "Written from your graded answers. Describe them as self-directed work samples and link this page as proof."),
    el("ul", {}, bullets.map((b) => el("li", {}, b))),
    el("div", { class: "actions" }, btn),
  );
}

function skillsCard() {
  if (!Array.isArray(data.skills) || data.skills.length === 0) return null;
  const names = new Map((config?.skills ?? []).map((s) => [s.id, s.name]));
  const levelNames = config?.skillLevels ?? [];
  const needs = new Map(role.needs.map((n) => [n.skill, n.level]));
  const relevant = data.skills.filter((s) => needs.has(s.id));
  const other = data.skills.filter((s) => !needs.has(s.id));
  const item = (s) =>
        el(
          "li",
          {},
          el(
            "div",
            { class: "row space" },
            el("strong", {}, names.get(s.id) ?? s.id, needs.has(s.id) ? el("span", { class: "pill" }, `role needs level ${needs.get(s.id)}`) : null),
            el("span", { class: "row tight" }, levelDots(s.level, 3), el("span", { class: "small muted" }, levelNames[s.level] ?? "")),
          ),
          s.verified && s.evidence ? el("blockquote", {}, "\u201C" + s.evidence + "\u201D") : el("div", { class: "small muted" }, "Not proven by a quote: counted as level 1."),
        );
  return el(
    "section",
    { class: "card" },
    el("h2", {}, "Skill evidence"),
    el("p", { class: "muted" }, "Skills found in the profile, each backed by a quote that code checked against the person's own text."),
    relevant.length ? el("ul", { class: "skills" }, relevant.map(item)) : el("p", { class: "muted" }, "None of this role's core skills were found yet."),
    other.length ? el("details", {}, el("summary", {}, `Other skills (${other.length})`), el("ul", { class: "skills" }, other.map(item))) : null,
    data.fit?.gaps?.length
      ? el("p", {}, el("strong", {}, "Gaps for this role: "), data.fit.gaps.map((g) => `${names.get(g.skill) ?? g.skill} (${g.have} to ${g.need}, about ${g.hours} h)`).join("; "))
      : null,
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

  mount(app, 
    demoBanner(data.mode) ?? "",
    el(
      "section",
      { class: "card hero-card" },
      el("p", { class: "eyebrow" }, `${data.track === "graduate" ? "Graduate" : "Career change"} test-drive · ${data.createdAt}`),
      el("h1", { class: "flush" }, role.title),
      el("p", { class: "muted" }, `From ${data.person?.situation ?? data.profile.currentRole}`),
      data.fit ? el("p", { class: "small" }, `Skill fit on paper: ${data.fit.fit}%. The work sample scores below show what you can actually do.`) : null,
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
      el("div", { class: "actions" }, copyBtn, el("a", { class: "secondary button", href: "/?step=map" }, "Try another direction")),
    ),
    ...data.tasks.map(taskCard),
    resumeCard() ?? "",
    skillsCard() ?? "",
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
        data.track === "graduate"
          ? [
              el("div", { class: "price" }, el("strong", {}, "$19"), el("span", {}, "One more direction test-drive")),
              el("div", { class: "price" }, el("strong", {}, "$49"), el("span", {}, "Three directions + launch plan + resume pack (parents can gift it)")),
            ]
          : [
              el("div", { class: "price" }, el("strong", {}, "$29"), el("span", {}, "One more role test-drive")),
              el("div", { class: "price" }, el("strong", {}, "$79"), el("span", {}, "Three roles + full switch plan")),
            ],
      ),
      el("p", { class: "fine" }, "Pricing preview. Payments are not active in this prototype."),
    ),
  );
}

(async () => {
  const token = location.hash.slice(1);
  if (!token) {
    mount(app, el("div", { class: "card" }, el("p", {}, "This link has no portfolio in it. "), el("a", { href: "/" }, "Start a test-drive")));
    return;
  }
  try {
    data = await decodeState(token);
    config = await api("/api/config");
    role = config.roles.find((r) => r.id === data.roleId);
    if (!role) throw new Error("Unknown role in link");
    await render();
  } catch (err) {
    mount(app, el("div", { class: "card error" }, "Could not open this portfolio link: " + err.message));
  }
})();
