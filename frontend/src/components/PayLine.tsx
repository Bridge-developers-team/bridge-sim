import { useQuery } from "@tanstack/react-query";
import { bridgeApi } from "../api/bridge";
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
        No pay figure found for this role in {countryName(country)}. The job listings on your plan show pay when employers post it.
      </p>
    );
  }
  return (
    <div className="pay">
      <p className="pay__amount">
        <span className="label">{pay.kind === "estimate" ? "Approximate pay" : "Typical pay"} in {pay.area}</span>
        <strong className="tabular">{payAmount(pay)}</strong> <span className="muted small">a {pay.period}</span>
      </p>
      <p className="fine">
        {pay.kind === "estimate" ? (
          <>Estimate{pay.note ? `: ${pay.note}.` : "."} Source: </>
        ) : (
          <>
            {pay.stat === "median" ? "Median" : "Average"} for “{pay.occupation}”, the closest official job title.
            {pay.note && <> {pay.note}</>}{" "}
          </>
        )}
        <a href={pay.url} target="_blank" rel="noopener noreferrer">
          {pay.source}
        </a>
      </p>
    </div>
  );
}
