const {
  computeValidity,
  computeMeals,
  allowedSlots,
  getMealSlot,
  todayStr,
  PLANS,
} = require('../utils/plans');

describe('plans util', () => {
  test('computeMeals returns the tier totals', () => {
    expect(computeMeals('Full Board')).toBe(90);
    expect(computeMeals('Lunch Only')).toBe(30);
    expect(computeMeals('Breakfast + Dinner')).toBe(60);
  });

  test('computeValidity adds 30 days to the start date', () => {
    const start = new Date('2026-01-01T00:00:00');
    const v = computeValidity(start, 'Full Board');
    // Compare in local time to avoid timezone-dependent flakiness.
    expect(v.getFullYear()).toBe(2026);
    expect(v.getMonth()).toBe(0); // January
    expect(v.getDate()).toBe(31);
  });

  test('allowedSlots returns the correct slots per plan', () => {
    expect(allowedSlots('Lunch Only')).toEqual(['Lunch']);
    expect(allowedSlots('Full Board')).toEqual(['Breakfast', 'Lunch', 'Dinner']);
    expect(allowedSlots('Breakfast + Dinner')).toEqual(['Breakfast', 'Dinner']);
  });

  test('getMealSlot resolves by time window', () => {
    expect(getMealSlot(new Date('2026-01-01T08:00:00'))).toBe('Breakfast');
    expect(getMealSlot(new Date('2026-01-01T13:00:00'))).toBe('Lunch');
    expect(getMealSlot(new Date('2026-01-01T19:00:00'))).toBe('Dinner');
    expect(getMealSlot(new Date('2026-01-01T03:00:00'))).toBeNull();
  });

  test('todayStr is YYYY-MM-DD', () => {
    expect(todayStr(new Date('2026-01-05T10:00:00'))).toBe('2026-01-05');
  });

  test('PLANS has the three tiers', () => {
    expect(Object.keys(PLANS)).toEqual(['Full Board', 'Lunch Only', 'Breakfast + Dinner']);
  });
});
