/** The journey store: one object, saved to localStorage after every change,
 * read by components through useJourney(). The resume text and income live in
 * `memory` only and are never written to storage. */
import { useSyncExternalStore } from "react";
import type { ResumeSource } from "../api/types";
import { type Journey, emptyJourney, parseJourney } from "../lib/journey.ts";
import { browserCountry, countryCurrency, withCountry } from "../lib/options.ts";

const KEY = "bridge-journey";

/** A first visit starts in the visitor's own country (from the browser's time
 * zone), not always in the United States. Its currency is set once the
 * country list has loaded (settleCurrency). */
function fresh(): Journey {
  const j = emptyJourney();
  startedFresh = true;
  return { ...j, profile: { ...j.profile, country: browserCountry() } };
}

let startedFresh = false;

function load(): Journey {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? parseJourney(raw) : fresh();
  } catch {
    return fresh(); // private mode or blocked storage
  }
}

/** After the reference data loads: a fresh visit gets its country's currency
 * (and the budget carried into it). A saved journey is never changed. */
export function settleCurrency(): void {
  if (!startedFresh) return;
  startedFresh = false;
  const { profile } = current;
  const currency = countryCurrency(profile.country);
  if (currency && currency !== profile.currency) {
    updateJourney((j) => ({ ...j, profile: withCountry({ ...j.profile, country: "" }, j.profile.country) }));
  }
}

let current: Journey = load();
const listeners = new Set<() => void>();

/** The experience text and what kind it is. Never written to storage. */
export const memory: { resumeText: string; resumeSource: ResumeSource } = { resumeText: "", resumeSource: "cv" };

export function getJourney(): Journey {
  return current;
}

export function updateJourney(change: (j: Journey) => Journey): void {
  current = change(current);
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    // Not saving costs the user a re-run after reload, nothing more.
  }
  listeners.forEach((l) => l());
}

export function resetJourney(): void {
  memory.resumeText = "";
  memory.resumeSource = "cv";
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
  current = fresh();
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useJourney(): Journey {
  return useSyncExternalStore(subscribe, getJourney);
}
