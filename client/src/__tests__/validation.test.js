import { describe, test, expect } from 'vitest';
import { validators, validateForm } from '../utils/validation';

describe('validation helpers', () => {
  test('name requires 2+ characters', () => {
    expect(validators.name('')).not.toBe('');
    expect(validators.name('A')).not.toBe('');
    expect(validators.name('Anna')).toBe('');
  });

  test('email must match the pattern', () => {
    expect(validators.email('not-an-email')).not.toBe('');
    expect(validators.email('a@b.com')).toBe('');
  });

  test('phone must be 10 digits', () => {
    expect(validators.phone('123')).not.toBe('');
    expect(validators.phone('1234567890')).toBe('');
  });

  test('password must be 6+ characters', () => {
    expect(validators.password('123')).not.toBe('');
    expect(validators.password('secret')).toBe('');
  });

  test('validateForm returns only failing fields', () => {
    const errors = validateForm({ name: 'A', email: 'bad', phone: '1234567890', password: 'secret' }, ['name', 'email', 'phone', 'password']);
    expect(errors.name).toBeDefined();
    expect(errors.email).toBeDefined();
    expect(errors.phone).toBeUndefined();
    expect(errors.password).toBeUndefined();
  });
});
