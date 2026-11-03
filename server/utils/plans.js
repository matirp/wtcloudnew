// Fixed plan tiers: meal credits and allowed meal slots.
const PLANS = {
  'Full Board': { mealsPerDay: 3, durationDays: 30, totalMeals: 90, slots: ['Breakfast', 'Lunch', 'Dinner'] },
  'Lunch Only': { mealsPerDay: 1, durationDays: 30, totalMeals: 30, slots: ['Lunch'] },
  'Breakfast + Dinner': { mealsPerDay: 2, durationDays: 30, totalMeals: 60, slots: ['Breakfast', 'Dinner'] },
};

const PLAN_NAMES = Object.keys(PLANS);

function getPlan(name) {
  return PLANS[name];
}

// Validity date = start + durationDays
function computeValidity(startDate, planName) {
  const plan = PLANS[planName];
  const start = new Date(startDate || Date.now());
  const v = new Date(start);
  v.setDate(v.getDate() + plan.durationDays);
  return v;
}

// Total meal credits for a plan
function computeMeals(planName) {
  return PLANS[planName].totalMeals;
}

// Meal slots allowed by a plan
function allowedSlots(planName) {
  return PLANS[planName].slots;
}

// Auto-detect meal slot from current time (returns null outside windows)
function getMealSlot(date = new Date()) {
  const h = date.getHours();
  if (h >= 7 && h < 11) return 'Breakfast';
  if (h >= 12 && h < 16) return 'Lunch';
  if (h >= 18 && h < 22) return 'Dinner';
  return null;
}

// "YYYY-MM-DD" string in local time (used as the per-day uniqueness key)
function todayStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

module.exports = {
  PLANS,
  PLAN_NAMES,
  getPlan,
  computeValidity,
  computeMeals,
  allowedSlots,
  getMealSlot,
  todayStr,
};
