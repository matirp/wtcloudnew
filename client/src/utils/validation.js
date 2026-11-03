// Client-side validation helpers (mirror server-side rules).

export const validators = {
  name: (v) => (!v || v.trim().length < 2 ? 'Name must be at least 2 characters' : ''),
  email: (v) => (!/^\S+@\S+\.\S+$/.test(v || '') ? 'Invalid email address' : ''),
  phone: (v) => (!/^[0-9]{10}$/.test(v || '') ? 'Phone must be 10 digits' : ''),
  password: (v) => (!v || v.length < 6 ? 'Password must be at least 6 characters' : ''),
};

// Validate a subset of fields; returns an errors object (empty when valid).
export function validateForm(values, fields) {
  const errors = {};
  for (const f of fields) {
    const err = validators[f](values[f]);
    if (err) errors[f] = err;
  }
  return errors;
}
