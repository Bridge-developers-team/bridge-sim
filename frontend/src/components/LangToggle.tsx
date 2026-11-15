import { useSyncExternalStore } from "react";
import { getLang, setLang, subscribeLang } from "../lib/i18n";

/** EN / RU: a small two-way switch whose thumb slides to the chosen language. */
export function LangToggle() {
  const lang = useSyncExternalStore(subscribeLang, getLang);
  const ru = lang === "ru";
  return (
    <button
      type="button"
      className={`lang-switch ${ru ? "is-ru" : ""}`}
      role="switch"
      aria-checked={ru}
      aria-label={ru ? "Язык: русский. Переключить на английский" : "Language: English. Switch to Russian"}
      data-no-translate
      onClick={() => setLang(ru ? "en" : "ru")}
    >
      <span className="lang-switch__thumb" aria-hidden="true" />
      <span className={`lang-switch__opt ${ru ? "" : "is-on"}`} aria-hidden="true">
        EN
      </span>
      <span className={`lang-switch__opt ${ru ? "is-on" : ""}`} aria-hidden="true">
        RU
      </span>
    </button>
  );
}
