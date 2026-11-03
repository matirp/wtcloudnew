const request = require('supertest');
const app = require('../server');
const { connectDB, disconnectDB } = require('./helpers/db');

beforeAll(connectDB);
afterAll(disconnectDB);

describe('health endpoint', () => {
  test('GET /api/health returns 200 ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('unknown route returns 404', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
  });
});
