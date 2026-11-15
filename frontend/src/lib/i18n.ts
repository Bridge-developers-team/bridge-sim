/** English (default) or Russian. The interface text is translated in place
 * from a dictionary: every text node and placeholder/label whose exact
 * English text is listed gets the Russian; AI-written content stays as
 * written. The choice is stored in this browser. */
import { RU } from "./ru.ts";

export type Lang = "en" | "ru";
const KEY = "bridge-lang";
const listeners = new Set<() => void>();

export function getLang(): Lang {
  try {
    return localStorage.getItem(KEY) === "ru" ? "ru" : "en";
  } catch {
    return "en";
  }
}

export function subscribeLang(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

// Originals of everything translated, so English can be put back.
const textOriginals = new Map<Text, string>();
const attrOriginals = new Map<Element, Record<string, string>>();
const ATTRS = ["placeholder", "aria-label", "title"];
let observer: MutationObserver | null = null;

function translateText(node: Text) {
  const value = node.nodeValue ?? "";
  const key = value.trim();
  if (!key) return;
  const ru = RU[key];
  if (ru === undefined || value.includes(ru)) return;
  textOriginals.set(node, value);
  node.nodeValue = value.replace(key, ru);
}

function translateAttrs(el: Element) {
  for (const a of ATTRS) {
    const v = el.getAttribute(a);
    if (!v) continue;
    const ru = RU[v.trim()];
    if (ru === undefined || v === ru) continue;
    const saved = attrOriginals.get(el) ?? {};
    saved[a] = v;
    attrOriginals.set(el, saved);
    el.setAttribute(a, ru);
  }
}

function translateTree(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) return translateText(root as Text);
  if (!(root instanceof Element)) return;
  if (root.closest("textarea, input, [data-no-translate]")) return;
  translateAttrs(root);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (n.nodeType === Node.TEXT_NODE) translateText(n as Text);
    else translateAttrs(n as Element);
  }
}

function restore() {
  observer?.disconnect();
  observer = null;
  for (const [node, original] of textOriginals) if (node.isConnected) node.nodeValue = original;
  for (const [el, saved] of attrOriginals) for (const [a, v] of Object.entries(saved)) el.setAttribute(a, v);
  textOriginals.clear();
  attrOriginals.clear();
}

function start() {
  translateTree(document.body);
  observer?.disconnect();
  observer = new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === "characterData") translateText(r.target as Text);
      else if (r.type === "attributes") translateAttrs(r.target as Element);
      else r.addedNodes.forEach(translateTree);
    }
  });
  observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}

export function applyLang(lang: Lang) {
  document.documentElement.lang = lang;
  if (lang === "ru") start();
  else restore();
}

export function setLang(lang: Lang) {
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    /* private mode: the choice lasts this visit */
  }
  applyLang(lang);
  listeners.forEach((l) => l());
}
