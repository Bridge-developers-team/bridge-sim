import type { ReactNode } from "react";

/** One status scale, five tones (facerec/znp palette). No border: outlined
 * pills read as noise. Tone maps live in lib/labels.ts, not at call sites. */
export type Tone = "ok" | "warn" | "danger" | "info" | "neutral";

export function Lozenge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`lozenge lozenge--${tone}`}>{children}</span>;
}
