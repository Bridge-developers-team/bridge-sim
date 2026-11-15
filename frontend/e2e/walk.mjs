// End-to-end: walks the judge path in a real browser against a running server
// (demo mode is enough), on a phone in light mode and a desktop in dark mode.
// Fails on console errors, failed requests or sideways page scroll.
//   BASE=http://localhost:8000 npm run e2e      (screenshots: e2e/out/)
// CHROME=/path/to/chrome uses an existing browser instead of Playwright's.
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:8000";
const OUT = fileURLToPath(new URL("./out/", import.meta.url));
await import("node:fs").then((fs) => fs.mkdirSync(OUT, { recursive: true }));
const problems = [];

async function noSideScroll(page, where) {
  const [scrollW, clientW] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  if (scrollW > clientW + 1) problems.push(`${where}: page scrolls sideways (${scrollW} > ${clientW})`);
}

async function run(name, viewport, colorScheme) {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
  const context = await browser.newContext({ viewport, colorScheme, isMobile: viewport.width < 500, hasTouch: viewport.width < 500 });
  const page = await context.newPage();
  page.on("console", (m) => m.type() === "error" && problems.push(`${name} console: ${m.text()}`));
  page.on("pageerror", (e) => problems.push(`${name} page error: ${e.message}`));
  page.on("response", (r) => r.status() >= 400 && problems.push(`${name} HTTP ${r.status()} ${r.url()}`));
  const shot = (step) => page.screenshot({ path: `${OUT}${name}-${step}.png`, fullPage: true });
  const t0 = Date.now();

  await page.goto(BASE + "/");
  await page.evaluate(() => localStorage.setItem("bridge-theme", "system"));
  await page.reload();
  await page.getByRole("heading", { name: "Change careers without starting over." }).waitFor();
  await noSideScroll(page, `${name} landing`);
  await shot("1-landing");

  await page.getByRole("button", { name: "Try the demo" }).click();
  await page.getByRole("heading", { name: "You're not starting from zero." }).waitFor();
  const cards = await page.locator("article.career").count();
  if (cards !== 3) problems.push(`${name}: expected 3 career cards, got ${cards}`);
  // Each path shows official pay or says there is none; never a made-up number.
  await page.locator(".pay").first().waitFor();
  const pays = await page.locator(".pay").count();
  if (pays !== 3) problems.push(`${name}: expected a pay line on 3 cards, got ${pays}`);
  await noSideScroll(page, `${name} paths`);
  await shot("2-paths");

  // Career tasting: taste two paths, rate them, and the map recommends one.
  for (const [i, feeling] of [[0, "I'd love it"], [1, "Dreading it"]]) {
    if (i === 0) await page.getByRole("button", { name: /^Start with .* · 10 min$/ }).click();
    else await page.getByRole("button", { name: /^Taste the next path/ }).click();
    await page.getByRole("heading", { name: /^Taste it:/ }).waitFor();
    await page.getByRole("button", { name: "Fill a sample answer" }).click();
    await page.waitForFunction(() => (document.querySelector("textarea")?.value ?? "").length > 50);
    await page.getByRole("button", { name: "Get feedback", exact: true }).click();
    await page.getByRole("radio", { name: feeling }).click();
  }
  await noSideScroll(page, `${name} taste`);
  await page.getByRole("button", { name: "See my Taste Map" }).click();
  await page.getByText("Recommended from your tastes").waitFor();
  const map = await page.locator("svg.taste-map title").textContent();
  if (!/Thrive|Grow into/.test(map ?? "")) problems.push(`${name}: taste map has no wanted path: ${map}`);
  await noSideScroll(page, `${name} taste map`);
  await shot("2b-taste-map");

  await page.getByRole("button", { name: "Build my 30-day plan" }).first().click();
  await page.locator("#packet-role").waitFor();
  // The month's course (real course pages, never a search), a study line in
  // every week, the if-then schedule and job openings for the role.
  await page.getByRole("heading", { name: "Your course for this month" }).waitFor();
  const courseLinks = await page.locator(".study .course__text a").evaluateAll((as) => as.map((a) => a.href));
  if (!courseLinks.length) problems.push(`${name}: no courses on the plan`);
  if (courseLinks.some((u) => /google\.com\/search|youtube\.com\/results/.test(u))) problems.push(`${name}: a search link: ${courseLinks}`);
  const weekLines = await page.getByText("Study this week").count();
  if (weekLines !== 4) problems.push(`${name}: expected a study line in 4 weeks, got ${weekLines}`);
  await page.getByRole("heading", { name: "Make it stick" }).waitFor();
  await page.getByText(/^When it's .* I open my Bridge plan and do the next task\.$/).waitFor();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Add to my calendar (.ics)" }).click();
  if ((await download).suggestedFilename() !== "bridge-study-plan.ics") problems.push(`${name}: calendar file not offered`);
  // Openings, recruiters and hot topics: LinkedIn and friends, never Google.
  for (const [group, expected] of [
    ["Openings", "LinkedIn: entry level"],
    ["Recruiters", "Recruiters on LinkedIn"],
    ["Hot topics this month", "LinkedIn posts"],
  ]) {
    const sites = await page.locator(`section.linkgroup[aria-label^="${group}"] .linkcard__site`).allTextContents();
    if (!sites.join(" ").includes(expected)) problems.push(`${name}: "${group}" links missing ${expected} (${sites})`);
  }
  const outside = await page.locator(".linkcard").evaluateAll((as) => as.map((a) => a.href));
  if (outside.some((u) => u.includes("google."))) problems.push(`${name}: jobs panel still links to Google search`);
  const note = await page.locator(".outreach__text").textContent();
  if (!note || note.length > 200) problems.push(`${name}: recruiter note missing or over 200 chars (${note?.length})`);
  await noSideScroll(page, `${name} plan`);
  await shot("3-plan");

  await page.getByRole("button", { name: "Open the practice task" }).click();
  await page.getByRole("heading", { name: /Try the job for/ }).waitFor();
  await page.getByRole("button", { name: "Fill a sample answer" }).click();
  await page.waitForFunction(() => (document.querySelector("textarea")?.value ?? "").length > 50);
  await page.getByRole("button", { name: "Get feedback" }).click();
  await page.getByText("AI practice feedback").waitFor();
  await noSideScroll(page, `${name} practice`);
  await shot("4-feedback");

  await page.getByLabel("Name to show (optional)").fill("Sam");
  await page.getByRole("button", { name: "Publish proof page" }).click();
  await page.getByText("Your proof page is live").waitFor();
  const url = await page.locator("a.link-box").innerText();

  const proofPage = await context.newPage();
  proofPage.on("pageerror", (e) => problems.push(`${name} proof page error: ${e.message}`));
  await proofPage.goto(url);
  await proofPage.getByRole("heading", { name: "Sam's practice task" }).waitFor();
  await noSideScroll(proofPage, `${name} proof`);
  await proofPage.screenshot({ path: `${OUT}${name}-5-proof.png`, fullPage: true });

  // Progress survives a reload, and the practice task counts as done.
  await page.goto(BASE + "/plan");
  const progressText = await page.getByText(/tasks done/).innerText();
  if (!/^1 of/.test(progressText)) problems.push(`${name}: after feedback expected 1 task done, got "${progressText}"`);

  console.log(`${name}: walked in ${Date.now() - t0} ms; proof at ${url}; ${progressText}`);
  await browser.close();
}


// The "Start with my CV" path: sample CV, tap-to-choose answers, three paths.
async function startForm() {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("pageerror", (e) => problems.push(`start-form page error: ${e.message}`));
  await page.goto(BASE + "/start");
  const submit = page.getByRole("button", { name: "Find my 3 paths" });
  // With no CV, submitting points at the CV card instead of leaving the page.
  await submit.click();
  await page.getByRole("alert").filter({ hasText: "Add your CV first" }).waitFor();
  if (!page.url().endsWith("/start")) problems.push("start-form: left /start with an empty CV");
  // Sample CV, then each settings row unfolds its list in place (no pop-up).
  const list = (name) => page.getByRole("group", { name });
  await page.getByRole("button", { name: "Try a sample CV" }).click();
  await list("Try a sample CV").getByRole("button", { name: /ICU nurse/ }).click();
  await list("Try a sample CV").waitFor({ state: "detached" });
  await page.getByRole("button", { name: /^Free time/ }).click();
  await list("Free hours a week for the switch").getByRole("button", { name: "8 hours a week" }).click();
  await list("Free hours a week for the switch").waitFor({ state: "detached" });
  await page.getByRole("button", { name: /^Why change/ }).click();
  await list("Why change?").getByRole("button", { name: "Less stress" }).click();
  await list("Why change?").getByRole("button", { name: "Done" }).click();
  await list("Why change?").waitFor({ state: "detached" });
  await page.getByRole("radio", { name: "Fast" }).click();
  await noSideScroll(page, "start-form");
  await page.screenshot({ path: `${OUT}start-form.png`, fullPage: true });
  await submit.click();
  await page.getByRole("heading", { name: "You're not starting from zero." }).waitFor();
  const titles = await page.locator(".career__title").allTextContents();
  if (!titles.includes("Clinical Informatics Analyst")) problems.push(`start-form: nurse paths missing, got ${titles}`);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("bridge-journey")).profile.hoursPerWeek);
  if (saved !== 8) problems.push(`start-form: hours not saved (${saved})`);
  console.log(`start-form: ${titles.join(", ")}`);
  await browser.close();
}

await startForm();
await run("phone-light", { width: 390, height: 844 }, "light");
await run("desktop-dark", { width: 1280, height: 900 }, "dark");
if (problems.length) {
  console.error("PROBLEMS:\n" + problems.join("\n"));
  process.exit(1);
}
console.log("No console errors, no failed requests, no sideways scroll.");
