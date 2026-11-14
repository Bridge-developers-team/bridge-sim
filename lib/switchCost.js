// Switch-cost plan: months of learning, course cost, income gap, break-even.
// Pure arithmetic on the role data in data/roles.js plus the user's inputs.

const WEEKS_PER_MONTH = 52 / 12;

// Sim score (0-100) adjusts the role's base learning hours:
// score 0 -> x1.4, 50 -> x1.0, 100 -> x0.6. No score -> x1.0.
export function skillMultiplier(simScore) {
  if (simScore === null || simScore === undefined || !Number.isFinite(Number(simScore))) return 1;
  const s = Math.min(100, Math.max(0, Number(simScore)));
  return Math.round((1.4 - 0.8 * (s / 100)) * 100) / 100;
}

export function courseCost(courses, months) {
  return courses.reduce((sum, c) => {
    if (c.billing === "monthly") return sum + c.price * months;
    return sum + c.price;
  }, 0);
}

// gapHours: study hours from the Bridge Map (lib/fit.js). When missing, the
// role's typical baseHours is used instead.
export function planSwitch({ role, currentSalary, hoursPerWeek, simScore = null, gapHours = null }) {
  const salary = Number(currentSalary);
  const hours = Number(hoursPerWeek);
  if (!role) throw new Error("Unknown role");
  if (!Number.isFinite(salary) || salary < 0) throw new Error("Current salary must be 0 or more");
  if (!Number.isFinite(hours) || hours < 1 || hours > 60) throw new Error("Hours per week must be between 1 and 60");

  const multiplier = skillMultiplier(simScore);
  const base = Number.isFinite(gapHours) && gapHours >= 0 ? gapHours : role.baseHours;
  const hoursNeeded = Math.round(base * multiplier);
  const months = Math.ceil(hoursNeeded / (hours * WEEKS_PER_MONTH));
  const courses = courseCost(role.courses, months);

  const firstYearChange = role.entryPay - salary; // negative = pay cut
  const annualGap = Math.max(0, salary - role.entryPay);
  const monthlyGap = Math.round(annualGap / 12);
  const longTermChange = role.medianPay - salary;

  // Years at median pay needed to win back courses + the first-year pay cut.
  const upfront = courses + annualGap;
  let breakEvenYears;
  if (upfront === 0) breakEvenYears = 0;
  else if (longTermChange > 0) breakEvenYears = Math.round((upfront / longTermChange) * 10) / 10;
  else breakEvenYears = null; // never pays back on salary alone

  return {
    multiplier,
    hoursNeeded,
    months,
    courseCost: courses,
    firstYearChange,
    monthlyGap,
    longTermChange,
    breakEvenYears,
  };
}
