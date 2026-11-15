/** The journey store: one object, saved to localStorage after every change,
 * read by components through useJourney(). The resume text and income live in
 * `memory` only and are never written to storage. */
import { useSyncExternalStore } from "react";
import type { ResumeSource } from "../api/types";
import { type Journey, emptyJourney, parseJourney } from "../lib/journey.ts";
import { browserCountry, withCountry } from "../lib/options.ts";

const KEY = "bridge-journey";

/** A first visit starts in the visitor's own country (from the browser's time
 * zone) with its currency, not always in the United States. */
function fresh(): Journey {
  const j = emptyJourney();
  return { ...j, profile: withCountry(j.profile, browserCountry()) };
}

function load(): Journey {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? parseJourney(raw) : fresh();
  } catch {
    return fresh(); // private mode or blocked storage
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
