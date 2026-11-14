import type { Mode } from "../../api/types";
import { MODE_NOTE } from "../../lib/labels";

/** Shown on every screen whose content is not live AI output. */
export function ModeBanner({ mode, action }: { mode: Mode | undefined; action?: React.ReactNode }) {
  const note = mode ? MODE_NOTE[mode] : null;
  if (!note) return null;
  return (
    <div className="mode-banner" role="note">
      <span>{note}</span>
      {action}
    </div>
  );
}
