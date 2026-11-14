/** The journey store: one object, saved to localStorage after every change,
 * read by components through useJourney(). The resume text and income live in
 * `memory` only and are never written to storage. */
import { useSyncExternalStore } from "react";
import { type Journey, emptyJourney, parseJourney } from "../lib/journey.ts";

const KEY = "bridge-journey";

function load(): Journey {
  try {
    return parseJourney(localStorage.getItem(KEY));
  } catch {
    return emptyJourney(); // private mode or blocked storage
  }
}

let current: Journey = load();
const listeners = new Set<() => void>();

export const memory: { resumeText: string } = { resumeText: "" };

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
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
  current = emptyJourney();
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useJourney(): Journey {
  return useSyncExternalStore(subscribe, getJourney);
}
