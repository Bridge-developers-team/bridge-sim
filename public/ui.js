// Tiny DOM helpers. All user and AI text goes through textContent (no innerHTML).

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === "class") node.className = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else if (v === true) node.setAttribute(k, "");
    else node.setAttribute(k, String(v));
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

// Replace a node's children, skipping null/false/"" (append() would print "null").
export function mount(node, ...children) {
  clear(node);
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false || c === "") continue;
    node.append(c);
  }
  return node;
}

const API_TIMEOUT_MS = 4 * 60 * 1000; // longer than the server's worst case (2 AI attempts x 120 s)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// One fetch with a timeout. A dropped connection (server restarting, Wi-Fi
// blip) is retried once; all our endpoints are safe to repeat.
async function fetchWithRetry(path, init) {
  for (let attempt = 1; ; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), API_TIMEOUT_MS);
    try {
      return await fetch(path, { ...init, signal: ctrl.signal });
    } catch (err) {
      if (err?.name === "AbortError") throw new Error("The AI took too long to answer. Please try again.");
      if (attempt >= 2) throw new Error("Lost connection to the Bridge server. Check that it is running, then try again.");
      await sleep(1500);
    } finally {
      clearTimeout(timer);
    }
  }
}

export async function api(path, body) {
  const res = await fetchWithRetry(path, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON error page */
  }
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}

export function money(n) {
  const sign = n < 0 ? "−" : "";
  return sign + "$" + Math.abs(Math.round(n)).toLocaleString("en-US");
}

export function wordCount(text) {
  return String(text).trim().split(/\s+/).filter(Boolean).length;
}

// Labels any content that did not come from the live AI.
export function modeBanner(mode) {
  if (mode === "demo") {
    return el(
      "div",
      { class: "banner", role: "status" },
      el("strong", {}, "Demo mode: sample data, not AI. "),
      "No API key is set on the server, so career paths, plans, practice tasks and feedback come from fixed templates and keyword matching. Add ANTHROPIC_API_KEY to .env and restart for real AI output.",
    );
  }
  if (mode === "sample") {
    return el(
      "div",
      { class: "banner", role: "status" },
      el("strong", {}, "Sample data, not AI. "),
      "You chose labeled sample data because the AI was unavailable. It comes from fixed templates, not from reading your profile.",
    );
  }
  return null;
}

// Stroke icons (24x24 grid, 2px round stroke), drawn as inline SVG.
const ICONS = {
  check: "M5 12.5l4.5 4.5L19 7.5",
  upload: "M12 16V4M7 9l5-5 5 5M5 20h14",
  arrowLeft: "M19 12H5M11 18l-6-6 6-6",
  arrowRight: "M5 12h14M13 6l6 6-6 6",
  calendar: "M4 6h16v14H4zM4 10h16M9 3v4M15 3v4",
  download: "M12 4v12M7 11l5 5 5-5M5 20h14",
  print: "M7 9V4h10v5M7 17H4v-7h16v7h-3M7 14h10v6H7z",
  external: "M14 4h6v6M20 4l-9 9M18 14v6H4V6h6",
};
export function icon(name) {
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("class", "icon");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(NS, "path");
  path.setAttribute("d", ICONS[name] ?? "");
  svg.append(path);
  return svg;
}
