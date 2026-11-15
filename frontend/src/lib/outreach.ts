/** A first message to a recruiter, ready to paste into a LinkedIn connection
 * request. LinkedIn caps notes at 200 characters on free accounts, so the
 * note always fits: the city goes first, then long role names are shortened. */

export const NOTE_LIMIT = 200;

function short(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
}

function article(word: string): string {
  return /^[aeiou]/i.test(word) ? "an" : "a";
}

export function connectionNote(currentRole: string, targetRole: string, city: string): string {
  const town = city.split(",")[0]?.trim() ?? "";
  const build = (from: string, to: string, where: string) => {
    const me = from ? `I'm ${article(from)} ${from} moving into ${to} work` : `I'm moving into ${to} work`;
    return `Hi [Name], ${me}${where ? ` in ${where}` : ""}. I'd value 10 minutes of your view on what teams look for. Happy to share a sample of my work. Thanks!`;
  };
  const from = currentRole.trim();
  const to = targetRole.trim() || "a new field";
  for (const attempt of [build(from, to, town), build(from, to, ""), build(short(from, 40), short(to, 40), "")]) {
    if (attempt.length <= NOTE_LIMIT) return attempt;
  }
  return short(build(short(from, 25), short(to, 25), ""), NOTE_LIMIT);
}
