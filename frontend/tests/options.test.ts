// Learning budget: every currency has its own round steps, and switching
// currency keeps the same step instead of reading 500 USD as 500 KZT.
import { test } from "node:test";
import assert from "node:assert/strict";
import { BUDGETS, budgetLabel, budgetSteps, convertBudget, CURRENCIES } from "../src/lib/options.ts";

test("every currency offers the same number of steps, starting at free", () => {
  for (const c of CURRENCIES) {
    assert.equal(BUDGETS[c].length, BUDGETS.USD.length, c);
    assert.equal(BUDGETS[c][0], 0, c);
  }
});

test("switching currency keeps the step, not the number", () => {
  assert.equal(convertBudget(500, "USD", "KZT"), 250_000);
  assert.equal(convertBudget(50_000, "KZT", "USD"), 100);
  assert.equal(convertBudget(0, "USD", "KZT"), 0);
  assert.equal(convertBudget(60, "USD", "GBP"), 40); // between steps: snaps down
});

test("unknown currencies fall back to USD steps; labels group thousands", () => {
  assert.deepEqual(budgetSteps("XYZ"), BUDGETS.USD);
  assert.equal(budgetLabel(250_000, "KZT"), "250,000 KZT a month");
  assert.equal(budgetLabel(0, "KZT"), "Free resources only");
});

import { CITIES_BY_COUNTRY, citiesFor, COUNTRIES, countryFromTimeZone, withCountry } from "../src/lib/options.ts";

test("every country on the form has its own city list, and no city is listed in two countries", () => {
  const seen = new Map<string, string>();
  for (const { value } of COUNTRIES) {
    assert.ok((CITIES_BY_COUNTRY[value] ?? []).length > 0, value);
    for (const city of CITIES_BY_COUNTRY[value]!) {
      assert.ok(!seen.has(city), `${city} in ${value} and ${seen.get(city)}`);
      seen.set(city, value);
    }
  }
  assert.ok(citiesFor("kz").some((c) => c.value === "Almaty"));
  assert.ok(!citiesFor("kz").some((c) => c.value === "Austin, TX"));
  assert.equal(citiesFor("kz").at(-1)?.value, "Remote");
});

test("the browser's time zone picks the starting country; unknown ones start in the US", () => {
  assert.equal(countryFromTimeZone("Asia/Almaty"), "kz");
  assert.equal(countryFromTimeZone("Asia/Qostanay"), "kz");
  assert.equal(countryFromTimeZone("Europe/London"), "gb");
  assert.equal(countryFromTimeZone("America/Toronto"), "ca");
  assert.equal(countryFromTimeZone("America/Chicago"), "us");
  assert.equal(countryFromTimeZone("Australia/Sydney"), "au");
  assert.equal(countryFromTimeZone("Asia/Tokyo"), "us");
  assert.equal(countryFromTimeZone(""), "us");
});

test("a new country drops a city from elsewhere, and the currency and budget step follow", () => {
  const us = { country: "us", location: "Austin, TX", currency: "USD", monthlyLearningBudget: 100 };
  const kz = withCountry(us, "kz");
  assert.deepEqual(kz, { country: "kz", location: "", currency: "KZT", monthlyLearningBudget: 50_000 });
  assert.equal(withCountry({ ...kz, location: "Almaty" }, "kz").location, "Almaty");
  assert.equal(withCountry({ ...us, location: "Remote" }, "gb").location, "Remote");
  // India and Singapore have no currency on the form: keep the user's.
  assert.equal(withCountry(us, "in").currency, "USD");
});
