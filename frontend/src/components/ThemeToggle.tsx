import { useEffect, useState } from "react";
import { applyTheme, getStoredTheme, watchSystemTheme, type Theme } from "../lib/theme";

const NEXT: Record<Theme, Theme> = { light: "dark", dark: "system", system: "light" };
const LABEL: Record<Theme, string> = { light: "Light", dark: "Dark", system: "Auto" };

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getStoredTheme);
  useEffect(() => watchSystemTheme(), []);
  return (
    <button
      type="button"
      className="btn btn--subtle btn--sm"
      aria-label={`Theme: ${LABEL[theme]}. Change theme`}
      onClick={() => {
        const next = NEXT[theme];
        applyTheme(next);
        setTheme(next);
      }}
    >
      {LABEL[theme]}
    </button>
  );
}
