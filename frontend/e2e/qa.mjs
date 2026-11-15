// Deep QA: everything a judge might click that the judge-path walk (walk.mjs)
// does not, against a running server in demo mode. Collects every problem
// instead of stopping at the first, and fails if there are any.
//   BASE=http://localhost:8000 npm run qa
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, firefox } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:8000";
const problems = [];
const check = (ok, message) => ok || problems.push(message);
const tmp = mkdtempSync(join(tmpdir(), "bridge-qa-"));

async function noSideScroll(page, where) {
  const [w, c] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  check(w <= c + 1, `${where}: page scrolls sideways (${w} > ${c})`);
}

async function open(name, viewport = { width: 390, height: 844 }, timezoneId = "America/Chicago") {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
  const context = await browser.newContext({ viewport, timezoneId, acceptDownloads: true });
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE });
  const page = await context.newPage();
  const requests = [];
  // "Failed to load resource" repeats a failed response, which is checked
  // below by URL (some 404s are asked for on purpose).
  page.on("console", (m) => {
    if (m.type() === "error" && !m.text().startsWith("Failed to load resource")) problems.push(`${name} console: ${m.text()}`);
  });
  page.on("pageerror", (e) => problems.push(`${name} page error: ${e.message}`));
  page.on("request", (r) => r.url().includes("/api/") && requests.push({ url: r.url(), body: r.postData() }));
  await page.addInitScript(() =>
    document.addEventListener("securitypolicyviolation", (e) => console.error(`CSP blocked ${e.blockedURI} (${e.violatedDirective})`)),
  );
  page.on("response", (r) => {
    // 404s that a test asks for on purpose are checked where they happen.
    if (r.status() >= 400 && !r.url().includes("/api/proofs/no-such")) problems.push(`${name} HTTP ${r.status()} ${r.url()}`);
  });
  return { browser, context, page, requests };
}

const list = (page, name) => page.getByRole("group", { name });

// 1. Start page: the three input tabs, validation, what is sent, country and city.
async function startPage() {
  const { browser, page, requests } = await open("start");
  await page.goto(BASE + "/start");
  // A Chicago time zone starts in the United States with dollars.
  await page.getByRole("button", { name: /^Country/ }).filter({ hasText: "United States" }).waitFor();

  // LinkedIn tab: a bad link is refused, a good one opens the profile.
  await page.getByRole("radio", { name: "LinkedIn" }).click();
  await page.getByLabel("Your LinkedIn profile link (optional)").fill("linkedin.com/company/acme");
  await page.getByText("That is not a profile link.").waitFor();
  await page.getByLabel("Your LinkedIn profile link (optional)").fill("kz.linkedin.com/in/jane-doe-123?trk=x");
  const href = await page.getByRole("link", { name: "Open my profile" }).getAttribute("href");
  check(href === "https://www.linkedin.com/in/jane-doe-123/", `start: LinkedIn profile link normalised wrong: ${href}`);
  await page.getByRole("button", { name: "Find my 3 paths" }).click();
  await page.getByRole("alert").filter({ hasText: "Add your LinkedIn PDF first" }).waitFor();

  // A LinkedIn export uploaded (as .txt here) on the LinkedIn tab is sent as linkedin.
  const exportFile = join(tmp, "Profile.txt");
  writeFileSync(
    exportFile,
    "Contact\nwww.linkedin.com/in/jane-doe-123 (LinkedIn)\nTop Skills\nCurriculum design\nJane Doe\nTeacher\n" +
      "Summary\nI turn messy material into clear lessons for 130 students a year.\nExperience\nLincoln Middle School\n" +
      "English Teacher\nAugust 2019 - Present (6 years)\nRedesigned a writing unit into self-paced lessons; pass rate rose from 58% to 71%.\n" +
      "Education\nState University\nPage 1 of 1\n",
  );
  await page.locator('input[type="file"]').setInputFiles(exportFile);
  await page.getByText("Profile.txt").waitFor();

  // Switching tabs keeps each tab's own text.
  await page.getByRole("radio", { name: "My words" }).click();
  const words = page.getByLabel("Describe your work in your own words");
  check((await words.inputValue()) === "", "start: 'In my words' should start empty, not with the LinkedIn text");
  await words.fill("I teach.");
  await page.getByRole("button", { name: "Find my 3 paths" }).click();
  await page.getByRole("alert").filter({ hasText: "Write a little more first" }).waitFor();
  check(page.url().endsWith("/start"), "start: left the page with too little text");
  await page.getByRole("radio", { name: "LinkedIn" }).click();
  await page.getByText("Profile.txt").waitFor();

  // Country first: Kazakhstan shows Kazakh cities only, switches to tenge, and clears a US city.
  await page.getByRole("button", { name: /^City/ }).click();
  await list(page, "Your city in United States").getByRole("button", { name: "Austin, TX" }).click();
  await page.getByRole("button", { name: /^Country/ }).click();
  await list(page, "Country").getByRole("button", { name: "Kazakhstan" }).click();
  await page.getByRole("button", { name: /^City/ }).filter({ hasText: "Optional" }).waitFor();
  await page.getByRole("button", { name: /^Currency/ }).filter({ hasText: "KZT" }).waitFor();
  await page.getByRole("button", { name: /^City/ }).click();
  const cityList = list(page, "Your city in Kazakhstan");
  await cityList.getByRole("button", { name: "Almaty" }).waitFor();
  check(await cityList.getByRole("button", { name: "Almaty" }).isVisible(), "start: Almaty missing for Kazakhstan");
  check((await cityList.getByRole("button", { name: "Austin, TX" }).count()) === 0, "start: US city offered for Kazakhstan");
  await cityList.getByRole("button", { name: "Almaty" }).click();
  // The budget is a typed amount in the country's currency.
  await page.getByLabel(/Learning budget/).fill("20000");
  await page.getByText("KZT a month", { exact: true }).waitFor();
  await page.getByText("Paid courses and certificates that fit this budget are included.").waitFor();
  await page.getByLabel(/Learning budget/).fill("0");
  await noSideScroll(page, "start");

  await page.getByRole("button", { name: "Find my 3 paths" }).click();
  await page.getByRole("heading", { name: "You're not starting from zero." }).waitFor();
  const careers = requests.find((r) => r.url.endsWith("/api/careers"));
  const body = careers?.body ? JSON.parse(careers.body) : {};
  check(body.source === "linkedin", `start: expected source linkedin, sent ${body.source}`);
  check(body.profile?.country === "kz" && body.profile?.location === "Almaty", `start: place not sent: ${JSON.stringify(body.profile)}`);
  check(!JSON.stringify(body).includes("jane-doe-123/"), "start: the profile link must not be sent to the server");

  // In my words: sent as text.
  requests.length = 0;
  await page.goto(BASE + "/start");
  await page.getByRole("radio", { name: "My words" }).click();
  await page
    .getByLabel("Describe your work in your own words")
    .fill("I have run a small bakery for six years. I hire and train staff, order stock, and handle the books. I love teaching new staff; I dislike the 4am starts.");
  await page.getByRole("button", { name: "Find my 3 paths" }).click();
  await page.getByRole("heading", { name: "You're not starting from zero." }).waitFor();
  const own = JSON.parse(requests.find((r) => r.url.endsWith("/api/careers"))?.body ?? "{}");
  check(own.source === "text", `start: expected source text, sent ${own.source}`);
  await browser.close();
  console.log("start page: checked");
}

// 2. A visitor from Almaty starts in Kazakhstan with tenge.
async function timeZoneDefault() {
  const { browser, page } = await open("tz", undefined, "Asia/Almaty");
  await page.goto(BASE + "/start");
  await page.getByRole("button", { name: /^Country/ }).filter({ hasText: "Kazakhstan" }).waitFor();
  await page.getByRole("button", { name: /^Currency/ }).filter({ hasText: "KZT" }).waitFor();
  await browser.close();
  console.log("time-zone default: checked");
}

// 3. A path with no hand-checked course never gets a course from another field.
async function noCrossFieldCourse() {
  const { browser, page, requests } = await open("course", { width: 1280, height: 900 });
  await page.goto(BASE + "/start");
  await page.getByRole("button", { name: "Try a sample CV" }).click();
  await list(page, "Try a sample CV").getByRole("button", { name: /ICU nurse/ }).click();
  await page.getByRole("button", { name: "Find my 3 paths" }).click();
  await page.getByRole("heading", { name: "You're not starting from zero." }).waitFor();
  const card = page.locator("article.career").filter({ hasText: "Quality Improvement Coordinator" });
  await card.getByRole("button", { name: /Skip to the plan|Build my 30-day plan/ }).click();
  await page.getByRole("heading", { name: "What to study this month" }).waitFor();
  await page.locator(".study").filter({ hasText: "does not cover this path yet" }).waitFor();
  const study = await page.locator(".study").innerText();
  check(!/CS50|Harvard|programming/i.test(study), `course: unrelated course for a quality coordinator: ${study.slice(0, 200)}`);
  check(study.includes("does not cover this path yet"), "course: no honest 'no match' message");
  check(requests.some((r) => r.url.includes("/api/study") && r.url.includes("field=other")), "course: field not sent to /api/study");

  // Jobs panel: job-title chips, country-first pickers, LinkedIn filters.
  const jobs = page.locator(".panel").filter({ hasText: "jobs and people" });
  await jobs.getByRole("radio").first().waitFor();
  const chips = await jobs.getByRole("radio").allTextContents();
  check(chips.length >= 1, "jobs: no job-title chips");
  const recruiters = await jobs.getByRole("link", { name: /Recruiters on LinkedIn/ }).getAttribute("href");
  const q = new URL(recruiters).searchParams;
  check(q.get("titleFreeText") === "recruiter" && q.get("geoUrn") === '["103644278"]', `jobs: recruiter filters wrong: ${recruiters}`);
  await jobs.getByRole("button", { name: /^Country/ }).click();
  await list(page, "Country").getByRole("button", { name: "United Kingdom" }).click();
  await jobs.getByRole("link", { name: /Recruiters on LinkedIn/ }).waitFor();
  await page.waitForFunction(() =>
    [...document.querySelectorAll("a")].some((a) => a.href.includes("geoUrn=%5B%22101165590%22%5D")),
  );
  const ukIndeed = await jobs.getByRole("link", { name: /^Indeed/ }).getAttribute("href");
  check(ukIndeed.startsWith("https://uk.indeed.com/"), `jobs: Indeed not UK after switching country: ${ukIndeed}`);
  await jobs.getByRole("button", { name: /^City/ }).click();
  await list(page, "Your city in").getByRole("button", { name: "Manchester" }).waitFor();
  const ukCities = await list(page, "Your city in").getByRole("button").allTextContents();
  check(ukCities.some((c) => c.includes("Manchester")) && !ukCities.some((c) => c.includes(", TX")), "jobs: city list not UK");
  await list(page, "Your city in").getByRole("button", { name: "Manchester" }).click();
  await page.waitForFunction(() =>
    [...document.querySelectorAll("a")].some((a) => a.href.includes("location=Manchester%2C+United+Kingdom")),
  );
  // The note copies to the clipboard.
  await jobs.getByText("A note to send them").click();
  await jobs.getByRole("button", { name: "Copy note" }).click();
  await jobs.getByRole("button", { name: "Copied" }).waitFor();
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  check(clip.startsWith("Hi [Name]") && clip.length <= 200, `jobs: copied note wrong: ${clip}`);
  await noSideScroll(page, "plan (desktop)");
  await browser.close();
  console.log("no cross-field course, jobs panel: checked");
}

// 4. Direct links and reloads: nothing blank, nothing broken.
async function directLinks() {
  const { browser, page } = await open("links");
  for (const [path, expect] of [
    ["/paths", "No paths yet"],
    ["/plan", null],
    ["/taste/no-such-path", null],
    ["/practice/no-such-task", null],
    ["/no-such-page", null],
  ]) {
    await page.goto(BASE + path);
    await page.waitForLoadState("networkidle");
    const text = (await page.locator("main").innerText().catch(() => "")).trim();
    check(text.length > 20, `links: ${path} renders an empty page`);
    if (expect) check(text.includes(expect), `links: ${path} should say "${expect}"`);
    const actions = await page.locator("main a, main button").count();
    check(actions > 0, `links: ${path} is a dead end (no link or button)`);
  }
  const res = await page.goto(BASE + "/p/no-such-proof");
  await page.waitForLoadState("networkidle");
  check(res.status() === 200, "links: proof route did not load the app");
  const proofText = await page.locator("main").innerText();
  check(/not found|no longer|deleted|does not exist/i.test(proofText), `links: missing proof page has no message: ${proofText.slice(0, 120)}`);

  // Demo, reload on each page, back button.
  await page.goto(BASE + "/");
  await page.getByRole("button", { name: "Try the demo" }).click();
  await page.getByRole("heading", { name: "You're not starting from zero." }).waitFor();
  await page.reload();
  await page.getByRole("heading", { name: "You're not starting from zero." }).waitFor();
  check((await page.locator("article.career").count()) === 3, "links: paths lost after reload");
  await page.locator("article.career").first().getByRole("button", { name: /Skip to the plan|Build my 30-day plan/ }).click();
  await page.locator("#packet-role").waitFor();
  await page.reload();
  await page.locator("#packet-role").waitFor();
  await page.goBack();
  await page.waitForLoadState("networkidle");
  check((await page.locator("main").innerText()).length > 20, "links: back button shows an empty page");
  await browser.close();
  console.log("direct links, reloads, back: checked");
}

// 5. Plan controls: tick, rebuild, calendar file, money check, proof delete.
async function planControls() {
  const { browser, page, context } = await open("plan", { width: 1280, height: 900 });
  await page.goto(BASE + "/");
  await page.getByRole("button", { name: "Try the demo" }).click();
  await page.locator("article.career").first().getByRole("button", { name: /Skip to the plan|Build my 30-day plan/ }).click();
  await page.locator("#packet-role").waitFor();
  const before = await page.getByText(/tasks done/).innerText();
  const box = page.locator(".tasks input[type=checkbox], .tasks [role=checkbox]").nth(1);
  if (await box.count()) {
    await box.click();
    const after = await page.getByText(/tasks done/).innerText();
    check(after !== before, `plan: ticking a task did not change progress (${before})`);
  } else problems.push("plan: no task checkbox found");
  // Rebuild with other hours keeps the page working.
  await page.getByRole("button", { name: "Rebuild the plan" }).click();
  await page.locator("#packet-role").waitFor();
  // Money check: numbers in, a result out, nothing sent.
  const money = page.locator(".panel").filter({ hasText: "Money check" });
  const inputs = money.locator("input");
  if ((await inputs.count()) >= 5) {
    await inputs.nth(2).fill("3");
    await inputs.nth(3).fill("4000");
    await inputs.nth(4).fill("3000");
    check(/\d/.test(await money.innerText()), "plan: money check shows no figure");
  }
  await noSideScroll(page, "plan");

  // Practice -> proof -> delete -> the public link is gone.
  await page.getByRole("button", { name: "Open the practice task" }).click();
  await page.getByRole("button", { name: "Fill a sample answer" }).click();
  await page.waitForFunction(() => (document.querySelector("textarea")?.value ?? "").length > 50);
  await page.getByRole("button", { name: "Get feedback" }).click();
  await page.getByRole("button", { name: "Publish proof page" }).click();
  const url = await page.locator("a.link-box").innerText();
  const preview = await (await context.request.get(url)).text();
  check(/<meta property="og:title" content="[^"]*practice task: [^"]+ \| Bridge"/.test(preview), "plan: proof link has no preview title");
  await page.getByRole("button", { name: "Delete page" }).click();
  await page.getByRole("button", { name: "Publish proof page" }).waitFor();
  const gone = await context.request.get(url.replace("/p/", "/api/proofs/"));
  check(gone.status() === 404, `plan: deleted proof still served (${gone.status()})`);
  await browser.close();
  console.log("plan controls, proof delete: checked");
}

// 6. Today's fixes: picker layout (also in Firefox), clearing a choice, the
// career card's order, work-style pills and a short pay box.
async function pickersAndCards() {
  for (const [name, engine] of [["chromium", chromium], ["firefox", firefox]]) {
    let browser;
    try {
      browser = await engine.launch();
    } catch (e) {
      if (name === "firefox" && !process.env.CI) {
        console.log("firefox not installed here: skipped (CI installs it)");
        continue;
      }
      throw e;
    }
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    page.on("pageerror", (e) => problems.push(`${name} page error: ${e.message}`));
    await page.goto(BASE + "/start");
    await page.getByRole("button", { name: /^Current role/ }).click();
    await page.getByRole("searchbox").fill("air");
    await page.waitForFunction(() => document.querySelectorAll(".picklist .opt").length > 20);
    const overflowing = await page.evaluate(() =>
      [...document.querySelectorAll(".picklist .opt")].filter((o) => o.querySelector("span").getBoundingClientRect().height > o.getBoundingClientRect().height + 1).length,
    );
    check(overflowing === 0, `${name}: ${overflowing} job titles overflow their row in the picker`);
    // Pick a role, then take it back.
    await page.locator(".picklist .opt").first().click();
    await page.getByRole("button", { name: /^Current role/ }).filter({ hasNotText: "Optional" }).waitFor();
    await page.locator(".picklist").waitFor({ state: "detached" }); // let the list finish folding away
    await page.getByRole("button", { name: /^Current role/ }).click();
    await page.getByRole("button", { name: /^Clear “/ }).click();
    await page.getByRole("button", { name: /^Current role/ }).filter({ hasText: "Optional" }).waitFor();
    await browser.close();
  }

  const { browser, page } = await open("cards", { width: 1280, height: 900 });
  await page.goto(BASE + "/");
  await page.getByRole("button", { name: "Try the demo" }).click();
  await page.getByRole("heading", { name: "You're not starting from zero." }).waitFor();
  await page.locator(".pay__amount").first().waitFor();
  const card = page.locator("article.career").first();
  const order = await card.evaluate((el) => {
    const pos = (sel) => [...el.querySelectorAll("*")].indexOf(el.querySelector(sel));
    return { meet: pos(".meet-btn"), summary: pos(".career__summary"), plan: pos(".plan-btn") };
  });
  // Information first, then the actions: Meet the job, then the plan.
  check(order.summary >= 0 && order.summary < order.meet && order.meet < order.plan, `cards: wrong order ${JSON.stringify(order)}`);
  const effort = await card.locator(".career__meta .lozenge").first().textContent();
  const modes = await card.locator(".career__modes").textContent();
  check(/effort/i.test(effort ?? "") && (modes ?? "").length > 2, `cards: effort or work modes missing: ${effort} / ${modes}`);
  const payText = await page.locator(".pay").first().innerText();
  check(!/closest official job title|Range across/i.test(payText), `cards: pay box still long: ${payText}`);
  check(/Source/i.test(payText), `cards: pay box lost its source: ${payText}`);
  await browser.close();
  console.log("pickers (chromium + firefox), card order, pills, pay box: checked");
}

// 7. Trust and safety: headers, a real PDF under the CSP, the crash screen,
// one pay request per card, the privacy page and proof link previews.
async function trustAndSafety() {
  const { browser, page, context, requests } = await open("trust", { width: 1280, height: 900 });
  const home = await page.goto(BASE + "/");
  const h = home.headers();
  check((h["content-security-policy"] ?? "").includes("frame-ancestors 'none'"), "trust: no CSP on the page");
  check(h["x-content-type-options"] === "nosniff", "trust: no nosniff header");
  const html = await home.text();
  check(/<meta property="og:image" content="https?:\/\/[^"]+\/og\.png"/.test(html), "trust: no absolute og:image");
  check((await context.request.get(BASE + "/og.png")).status() === 200, "trust: og.png missing");

  // A real PDF (made by the browser itself) is read under the CSP.
  const pdfPage = await context.newPage();
  await pdfPage.setContent("<h1>Jane Doe</h1><p>English teacher for 7 years. Redesigned a writing unit into self-paced lessons; the pass rate rose from 58% to 71%. Lead training sessions for colleagues.</p>");
  const pdfFile = join(tmp, "cv.pdf");
  await pdfPage.pdf({ path: pdfFile });
  await pdfPage.close();
  await page.goto(BASE + "/start");
  await page.locator('input[type="file"]').first().setInputFiles(pdfFile);
  await page.getByText("cv.pdf").waitFor();
  await page.getByText(/\d+ words · read on this device/).waitFor();

  // One pay request per card, so each card fills in on its own.
  requests.length = 0;
  await page.goto(BASE + "/");
  await page.getByRole("button", { name: "Try the demo" }).click();
  await page.locator(".pay__amount").first().waitFor();
  await page.waitForLoadState("networkidle");
  const payCalls = requests.filter((r) => r.url.endsWith("/api/pay")).map((r) => JSON.parse(r.body).roles.length);
  check(payCalls.length === 3 && payCalls.every((n) => n === 1), `trust: expected 3 single-role pay requests, got ${JSON.stringify(payCalls)}`);

  // Privacy page from the footer.
  await page.getByRole("link", { name: "Privacy" }).click();
  await page.getByRole("heading", { name: "Privacy", level: 1 }).waitFor();
  check((await page.locator("main").innerText()).includes("bridge-journey"), "trust: privacy page incomplete");
  await noSideScroll(page, "privacy");

  // A page that crashes shows a way out, not a blank screen.
  const crashPage = await context.newPage();
  const crashErrors = [];
  crashPage.on("console", (m) => m.type() === "error" && crashErrors.push(m.text()));
  await crashPage.route("**/api/careers", (r) => r.fulfill({ status: 200, contentType: "application/json", body: '{"profile":{},"careers":[{"id":"x"}],"mode":"live"}' }));
  await crashPage.goto(BASE + "/");
  await crashPage.getByRole("button", { name: "Try the demo" }).click();
  await crashPage.getByRole("heading", { name: "Something went wrong on this page" }).waitFor();
  check(await crashPage.getByRole("button", { name: "Reload the page" }).isVisible(), "trust: crash screen has no reload");
  check(await crashPage.locator("header").first().isVisible(), "trust: crash took the header down");
  await crashPage.close();
  await browser.close();
  console.log("headers, CSP, PDF under CSP, per-card pay, privacy, crash screen: checked");
}

await startPage();
await pickersAndCards();
await trustAndSafety();
await timeZoneDefault();
await noCrossFieldCourse();
await directLinks();
await planControls();
if (problems.length) {
  console.error("PROBLEMS:\n" + problems.map((p) => "- " + p).join("\n"));
  process.exit(1);
}
console.log("QA: no problems found.");
