/** Theme: a `dark` class on <html>, nothing else (same contract as the facerec
 * dashboard). "system" is resolved to light or dark when applied, and again
 * when the OS preference changes while the tab is open. index.html applies the
 * saved choice before first paint. */
export type Theme = "light" | "dark" | "system";

const KEY = "bridge-theme";

const darkQuery = (): MediaQueryList | null =>
  typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : null;

export function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {
    // private mode: default below
  }
  return "system";
}

export function applyTheme(theme: Theme): void {
  const dark = theme === "dark" || (theme === "system" && Boolean(darkQuery()?.matches));
  document.documentElement.classList.toggle("dark", dark);
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // the page still themes correctly
  }
}

export function watchSystemTheme(): () => void {
  const query = darkQuery();
  if (!query) return () => {};
  const onChange = () => {
    if (getStoredTheme() === "system") applyTheme("system");
  };
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
