import { useState } from "react";
import { type FinanceInput, transitionCost } from "../lib/finance";
import { TextInput } from "./ui/Field";
import { Panel, PanelBody, PanelHeader } from "./ui/Panel";

/** What the switch could cost, from the user's own numbers only. Computed in
 * the browser; nothing typed here is sent or saved. */
export function MoneyCheck({ budget, currency }: { budget: number; currency: string }) {
  const [input, setInput] = useState<FinanceInput>({
    learningPerMonth: budget,
    learningMonths: 3,
    monthsReduced: "",
    currentMonthlyIncome: "",
    expectedMonthlyIncome: "",
  });
  const result = transitionCost(input);
  const money = (n: number) => `${Math.round(n).toLocaleString()} ${currency}`;
  const field = (key: keyof FinanceInput, label: string) => (
    <TextInput
      label={label}
      inputMode="decimal"
      value={input[key]}
      onChange={(e) => setInput((v) => ({ ...v, [key]: e.target.value }))}
    />
  );

  return (
    <Panel>
      <PanelHeader title="Money check (optional)" note="Stays on this device" />
      <PanelBody className="stack">
        <p className="muted small">
          What the switch might cost, from your own numbers. Bridge never guesses salaries or prices.
        </p>
        <div className="grid-3">
          {field("learningPerMonth", `Learning per month (${currency})`)}
          {field("learningMonths", "Months of learning")}
          {field("monthsReduced", "Months at lower income")}
          {field("currentMonthlyIncome", `Income now per month (${currency})`)}
          {field("expectedMonthlyIncome", `Expected income at first (${currency})`)}
        </div>
        {result.ok ? (
          <div className="money" role="status">
            <span className="money__total tabular">{money(result.total)}</span>
            <span className="muted small">
              {money(result.learning)} learning + {money(result.incomeGap)} income gap
              {result.shortfall > 0 && ` (${money(result.shortfall)} a month)`}
            </span>
          </div>
        ) : (
          <p className="muted small">Not enough information for an estimate yet: add {result.missing.join(", ")}.</p>
        )}
      </PanelBody>
    </Panel>
  );
}
