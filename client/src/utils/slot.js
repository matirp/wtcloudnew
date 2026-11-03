export const MEAL_SLOTS = ['Breakfast', 'Lunch', 'Dinner'];

// Plan tier definitions mirrored from the server.
export const PLAN_DETAILS = {
  'Full Board': { totalMeals: 90, durationDays: 30, slots: ['Breakfast', 'Lunch', 'Dinner'] },
  'Lunch Only': { totalMeals: 30, durationDays: 30, slots: ['Lunch'] },
  'Breakfast + Dinner': { totalMeals: 60, durationDays: 30, slots: ['Breakfast', 'Dinner'] },
};

export const PLAN_NAMES = Object.keys(PLAN_DETAILS);

// Auto-detect the current meal slot from the time (null outside windows).
export function getMealSlot(date = new Date()) {
  const h = date.getHours();
  if (h >= 7 && h < 11) return 'Breakfast';
  if (h >= 12 && h < 16) return 'Lunch';
  if (h >= 18 && h < 22) return 'Dinner';
  return null;
}

export function allowedSlots(planType) {
  return PLAN_DETAILS[planType]?.slots || [];
}

export function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString();
}

export function isExpired(validityDate) {
  return !!validityDate && new Date(validityDate) < new Date();
}

// "YYYY-MM-DD" string in local time (used as the per-day uniqueness key).
export function todayStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
