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
      if (attempt >= 2) throw new Error("Lost connection to the Bridge Sim server. Check that it is running, then try again.");
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

export function demoBanner(mode) {
  if (mode !== "demo") return null;
  return el(
    "div",
    { class: "banner", role: "status" },
    el("strong", {}, "Demo mode. "),
    "No API key is set on the server, so tasks and grades are fixed sample output, not AI. Add ANTHROPIC_API_KEY or DEEPSEEK_API_KEY to .env and restart to use the real thing.",
  );
}
