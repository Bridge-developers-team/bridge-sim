import { useQuery } from "@tanstack/react-query";
import { bridgeApi } from "../api/bridge";
import { useConfig } from "../api/hooks";
import type { Pay } from "../api/types";
import { countryName } from "../lib/options";
import { useJourney } from "../state/journey";

/** Typical pay for the three paths where the user lives: official tables
 * first, else a figure the live AI found on a cited web page. One request
 * for all three, shared by the paths page and each job introduction. */
export function usePathPay() {
  const journey = useJourney();
  const titles = journey.careers?.careers.map((c) => c.title) ?? [];
  const fields = journey.careers?.careers.map((c) => c.field ?? "") ?? [];
  const country = journey.profile.country || "us";
  const sample = journey.careers?.mode === "sample";
  return useQuery({
    queryKey: ["pay", titles, fields, country, journey.profile.location, sample],
    queryFn: () => bridgeApi.pay(titles, fields, country, countryName(country), journey.profile.location, sample),
    enabled: titles.length > 0,
    staleTime: Infinity,
    retry: false,
  });
}

function money(n: number, currency: string): string {
  try {
    return n.toLocaleString("en-US", { style: "currency", currency, maximumFractionDigits: 0 });
  } catch {
    return `${n.toLocaleString("en-US")} ${currency}`;
  }
}

export function payAmount(pay: Pay): string {
  return pay.low === pay.high ? money(pay.low, pay.currency) : `${money(pay.low, pay.currency)} – ${money(pay.high, pay.currency)}`;
}

/** The pay box on a career card or an intro slide. An estimate says so and
 * links its page; an official figure names the official job title. */
export function PayLine({ pay, loading, country }: { pay: Pay | null | undefined; loading: boolean; country: string }) {
  const live = useConfig().data?.mode === "live";
  if (loading) {
    return (
      <div className="pay pay--loading" aria-busy="true">
        <span className="label">Typical pay</span>
        <span className="pay__skeleton" />
      </div>
    );
  }
  if (!pay) {
    return (
      <p className="pay pay--none small muted">
        {live
          ? `No pay figure for ${countryName(country)} yet.`
          : `Sample mode knows official US and Kazakhstan pay only; the live AI looks up pay for ${countryName(country)}.`}
      </p>
    );
  }
  const label = pay.kind === "official" ? "Typical pay" : pay.kind === "estimate" ? "Typical pay" : "Estimated pay";
  const links = pay.kind === "official" ? [{ title: pay.source, url: pay.url }] : (pay.sources ?? []);
  return (
    <div className="pay">
      <p className="pay__amount">
        <span className="label">
          {label} · {pay.area}
        </span>
        <strong className="tabular">{payAmount(pay)}</strong> <span className="muted small">{`a ${pay.period}`}</span>
      </p>
      <p className="fine pay__sources">
        {pay.kind === "ai" ? (
          "AI estimate, no published figure found."
        ) : (
          <>
            {pay.kind === "estimate" && links.length > 1 ? `Median of ${links.length} sources: ` : "Source: "}
            {links.map((l, i) => (
              <span key={l.url}>
                {i > 0 && ", "}
                <a href={l.url} target="_blank" rel="noopener noreferrer">
                  {pay.kind === "official" ? l.title : hostOf(l.url)}
                </a>
              </span>
            ))}
          </>
        )}
      </p>
    </div>
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
