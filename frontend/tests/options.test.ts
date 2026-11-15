// Pick lists: every country with its currency, and search that ranks the
// best matches first.
import { test } from "node:test";
import assert from "node:assert/strict";
import { budgetLabel, COUNTRIES, countryCurrency, CURRENCY_OPTIONS, rankOptions } from "../src/lib/options.ts";

test("every country is listed, with its own currency", () => {
  assert.ok(COUNTRIES.length > 240);
  assert.equal(countryCurrency("kz"), "KZT");
  assert.equal(countryCurrency("de"), "EUR");
  assert.ok(CURRENCY_OPTIONS.some((c) => c.value === "KZT"));
});

test("search puts titles that start with the query first", () => {
  const opts = ["Data Analyst", "Big Data Engineer", "Database Administrator", "Metadata Librarian"].map((l) => ({ value: l, label: l }));
  assert.deepEqual(
    rankOptions(opts, "data").map((o) => o.label),
    ["Data Analyst", "Database Administrator", "Big Data Engineer", "Metadata Librarian"],
  );
});

test("budget labels group thousands and say when it is free", () => {
  assert.equal(budgetLabel(250_000, "KZT"), "250,000 KZT a month");
  assert.equal(budgetLabel(0, "KZT"), "Free courses only");
});

import { countryFromTimeZone, withCountry } from "../src/lib/options.ts";

test("the browser's time zone picks the starting country; unknown ones start in the US", () => {
  assert.equal(countryFromTimeZone("Asia/Almaty"), "kz");
  assert.equal(countryFromTimeZone("Asia/Qostanay"), "kz");
  assert.equal(countryFromTimeZone("Europe/London"), "gb");
  assert.equal(countryFromTimeZone("America/Toronto"), "ca");
  assert.equal(countryFromTimeZone("America/Chicago"), "us");
  assert.equal(countryFromTimeZone("Australia/Sydney"), "au");
  assert.equal(countryFromTimeZone(""), "us");
});

test("a new country drops a city from elsewhere, and the currency and budget follow", () => {
  const us = { country: "us", location: "Austin, TX", currency: "USD", monthlyLearningBudget: 100 };
  const kz = withCountry(us, "kz");
  assert.deepEqual(kz, { country: "kz", location: "", currency: "KZT", monthlyLearningBudget: 50_000 });
  assert.equal(withCountry({ ...kz, location: "Almaty" }, "kz").location, "Almaty"); // same country: kept
  assert.equal(withCountry({ ...us, location: "Remote" }, "gb").location, "Remote");
  assert.equal(withCountry(us, "jp").currency, "JPY"); // every country has its own currency
});
