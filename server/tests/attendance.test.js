const request = require('supertest');
const app = require('../server');
const { connectDB, clearDB, disconnectDB } = require('./helpers/db');

beforeAll(connectDB);
afterEach(clearDB);
afterAll(disconnectDB);

const validCustomer = { name: 'Alice Smith', email: 'alice@x.com', phone: '9876543210', planType: 'Full Board' };

async function createCustomer(overrides = {}) {
  const res = await request(app).post('/api/customers').send({ ...validCustomer, ...overrides });
  return res.body;
}

describe('attendance', () => {
  test('a valid check-in decrements meals and creates a log', async () => {
    const c = await createCustomer();
    const res = await request(app).post('/api/attendance/checkin').send({ messId: c.messId, mealSlot: 'Breakfast' });
    expect(res.status).toBe(201);
    expect(res.body.customer.mealsRemaining).toBe(89);
    expect(res.body.attendance.mealSlot).toBe('Breakfast');
  });

  test('duplicate check-in for the same slot/day returns 409', async () => {
    const c = await createCustomer({ email: 'b@x.com' });
    await request(app).post('/api/attendance/checkin').send({ messId: c.messId, mealSlot: 'Breakfast' });
    const res = await request(app).post('/api/attendance/checkin').send({ messId: c.messId, mealSlot: 'Breakfast' });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already checked in/i);
  });

  test('different slots on the same day are all allowed', async () => {
    const c = await createCustomer({ email: 'c@x.com' });
    const b = await request(app).post('/api/attendance/checkin').send({ messId: c.messId, mealSlot: 'Breakfast' });
    const l = await request(app).post('/api/attendance/checkin').send({ messId: c.messId, mealSlot: 'Lunch' });
    const d = await request(app).post('/api/attendance/checkin').send({ messId: c.messId, mealSlot: 'Dinner' });
    expect(b.status).toBe(201);
    expect(l.status).toBe(201);
    expect(d.status).toBe(201);
  });

  test('a slot not in the plan returns 400', async () => {
    const c = await createCustomer({ email: 'd@x.com', planType: 'Lunch Only' });
    const res = await request(app).post('/api/attendance/checkin').send({ messId: c.messId, mealSlot: 'Breakfast' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/not part of/i);
  });

  test('check-in for a deactivated customer returns 403', async () => {
    const c = await createCustomer({ email: 'e@x.com' });
    await request(app).delete(`/api/customers/${c._id}`); // soft-delete
    const res = await request(app).post('/api/attendance/checkin').send({ messId: c.messId, mealSlot: 'Breakfast' });
    expect(res.status).toBe(403);
  });

  test('attendance log lists all entries', async () => {
    const c = await createCustomer({ email: 'f@x.com' });
    await request(app).post('/api/attendance/checkin').send({ messId: c.messId, mealSlot: 'Breakfast' });
    const res = await request(app).get('/api/attendance');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
  });

  test('attendance log can be filtered by date', async () => {
    const c = await createCustomer({ email: 'g@x.com' });
    await request(app).post('/api/attendance/checkin').send({ messId: c.messId, mealSlot: 'Lunch' });
    // Use local date (same as server's todayStr) to avoid UTC vs local mismatch
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const res = await request(app).get(`/api/attendance?date=${today}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
  });
});
