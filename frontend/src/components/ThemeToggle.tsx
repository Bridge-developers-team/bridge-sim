import { useEffect, useState } from "react";
import { applyTheme, watchSystemTheme } from "../lib/theme";
import { MoonIcon, SunIcon } from "./Icons";

/** Two states only: light or dark. The first visit follows the device; any
 * click stores an explicit choice. The thumb slides from left to right
 * (sun to moon) while the label slides the other way. */
function isDark(): boolean {
  return document.documentElement.classList.contains("dark");
}

export function ThemeToggle() {
  const [dark, setDark] = useState(isDark);
  useEffect(() => watchSystemTheme(), []);
  return (
    <button
      type="button"
      className={`theme-switch ${dark ? "is-dark" : ""}`}
      role="switch"
      aria-checked={dark}
      aria-label="Dark mode"
      onClick={() => {
        const next = !isDark();
        applyTheme(next ? "dark" : "light");
        setDark(next);
      }}
    >
      <span className="theme-switch__label" aria-hidden="true">
        {dark ? "Dark" : "Light"}
      </span>
      <span className="theme-switch__thumb" aria-hidden="true">
        <span className="theme-switch__sun">
          <SunIcon />
        </span>
        <span className="theme-switch__moon">
          <MoonIcon />
        </span>
      </span>
    </button>
  );
}
