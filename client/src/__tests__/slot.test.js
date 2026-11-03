import { describe, test, expect } from 'vitest';
import { getMealSlot, allowedSlots, todayStr, isExpired } from '../utils/slot';

describe('slot helpers', () => {
  test('getMealSlot resolves by time window', () => {
    expect(getMealSlot(new Date('2026-01-01T08:00:00'))).toBe('Breakfast');
    expect(getMealSlot(new Date('2026-01-01T13:00:00'))).toBe('Lunch');
    expect(getMealSlot(new Date('2026-01-01T19:00:00'))).toBe('Dinner');
    expect(getMealSlot(new Date('2026-01-01T03:00:00'))).toBeNull();
  });

  test('allowedSlots per plan', () => {
    expect(allowedSlots('Lunch Only')).toEqual(['Lunch']);
    expect(allowedSlots('Full Board')).toEqual(['Breakfast', 'Lunch', 'Dinner']);
  });

  test('todayStr format', () => {
    expect(todayStr(new Date('2026-01-05T10:00:00'))).toBe('2026-01-05');
  });

  test('isExpired', () => {
    expect(isExpired(new Date('2020-01-01'))).toBe(true);
    expect(isExpired(new Date('2099-01-01'))).toBe(false);
    expect(isExpired(null)).toBe(false);
  });
});
