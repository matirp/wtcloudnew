const request = require('supertest');
const app = require('../server');
const { connectDB, clearDB, disconnectDB } = require('./helpers/db');

beforeAll(connectDB);
afterEach(clearDB);
afterAll(disconnectDB);

const valid = { name: 'Jane Doe', email: 'jane@x.com', phone: '9876543210', planType: 'Full Board' };

describe('customer CRUD', () => {
  test('create auto-calculates meals and validity', async () => {
    const res = await request(app).post('/api/customers').send(valid);
    expect(res.status).toBe(201);
    expect(res.body.messId).toMatch(/^MESS-\d{4}$/);
    expect(res.body.mealsRemaining).toBe(90);
    expect(res.body.validityDate).toBeDefined();
  });

  test('updating the plan recomputes validity and meals', async () => {
    const create = await request(app).post('/api/customers').send(valid);
    const res = await request(app)
      .put(`/api/customers/${create.body._id}`)
      .send({ planType: 'Lunch Only' });
    expect(res.status).toBe(200);
    expect(res.body.planType).toBe('Lunch Only');
    expect(res.body.mealsRemaining).toBe(30);
  });

  test('invalid phone returns 400', async () => {
    const res = await request(app)
      .post('/api/customers')
      .send({ ...valid, phone: '123' });
    expect(res.status).toBe(400);
  });

  test('duplicate email returns 409', async () => {
    await request(app).post('/api/customers').send(valid);
    const res = await request(app).post('/api/customers').send({ ...valid, name: 'Other' });
    expect(res.status).toBe(409);
  });

  test('soft-delete deactivates a customer', async () => {
    const create = await request(app).post('/api/customers').send(valid);
    const res = await request(app).delete(`/api/customers/${create.body._id}`);
    expect(res.status).toBe(200);
    expect(res.body.customer.active).toBe(false);
  });

  test('face descriptor can be stored and /faces returns it', async () => {
    const create = await request(app).post('/api/customers').send(valid);
    const desc = Array.from({ length: 128 }, () => 0.1);
    const set = await request(app)
      .put(`/api/customers/${create.body._id}/face`)
      .send({ faceDescriptor: desc });
    expect(set.status).toBe(200);

    const faces = await request(app).get('/api/customers/faces');
    expect(faces.body.length).toBe(1);
    expect(faces.body[0].faceDescriptor.length).toBe(128);
  });

  test('/faces excludes customers without a descriptor', async () => {
    await request(app).post('/api/customers').send(valid);
    const faces = await request(app).get('/api/customers/faces');
    expect(faces.body.length).toBe(0);
  });

  test('by-mess lookup works', async () => {
    const create = await request(app).post('/api/customers').send(valid);
    const res = await request(app).get(`/api/customers/by-mess/${create.body.messId}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Jane Doe');
  });

  test('list supports search filter', async () => {
    await request(app).post('/api/customers').send(valid);
    await request(app).post('/api/customers').send({ ...valid, email: 'bob@x.com', name: 'Bob Smith' });
    const res = await request(app).get('/api/customers?search=Bob');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].name).toBe('Bob Smith');
  });
});
