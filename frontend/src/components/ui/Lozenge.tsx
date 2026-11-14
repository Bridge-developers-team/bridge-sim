import type { ReactNode } from "react";
import type { TaskType } from "../../api/types";

/** A round pill. Tone carries state (ok, warn, danger); `kind` adds the task's
 * variety-colour square. Tone maps live in lib/labels.ts, not at call sites. */
export type Tone = "ok" | "warn" | "danger" | "info" | "neutral";

export function Lozenge({ tone, kind, children }: { tone?: Tone; kind?: TaskType; children: ReactNode }) {
  return (
    <span className={`lozenge ${tone ? `lozenge--${tone}` : ""}`} data-kind={kind}>
      {children}
    </span>
  );
}
