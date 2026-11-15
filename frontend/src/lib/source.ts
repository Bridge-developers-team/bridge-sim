/** The three ways to tell Bridge about your experience, and how to tell them
 * apart. The server's prompt reads each kind differently (backend
 * llm/prompts.py, INPUT TYPE). */
import type { ResumeSource } from "../api/types";

export type InputMode = "cv" | "linkedin" | "text";

/** A LinkedIn "Save to PDF" export: it carries the profile address and
 * LinkedIn's own section names. */
export function looksLikeLinkedInPdf(text: string): boolean {
  const t = text.slice(0, 6000);
  const hasUrl = /linkedin\.com\/in\/[A-Za-z0-9\-_%]+/i.test(t);
  const sections = ["Top Skills", "Experience", "Education", "Summary", "Contact"].filter((s) =>
    new RegExp(`(^|\\n)\\s*${s}\\s*(\\n|$)`).test(t),
  ).length;
  return hasUrl && sections >= 2;
}

/** What to tell the server the text is. A CV upload that turns out to be a
 * LinkedIn export is read as LinkedIn. */
export function resumeSource(mode: InputMode, text: string): ResumeSource {
  if (mode === "text") return "text";
  if (mode === "linkedin" || looksLikeLinkedInPdf(text)) return "linkedin";
  return "cv";
}

/** A public LinkedIn profile address, normalised to https://www.linkedin.com/in/<name>/,
 * or null when it is not one. Bridge never fetches it: LinkedIn does not let
 * other sites read profiles, so the link only opens the profile for the user. */
export function linkedinProfileUrl(input: string): string | null {
  const m = input
    .trim()
    .match(/^(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/in\/([A-Za-z0-9\-_%]{3,100})\/?(?:[?#].*)?$/i);
  return m ? `https://www.linkedin.com/in/${m[1]}/` : null;
}
