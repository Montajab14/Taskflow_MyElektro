const request = require('supertest');
const createApp = require('../src/app');

const app = createApp();

test('GET /api/health répond 200', async () => {
  const res = await request(app).get('/api/health');
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ status: 'ok' });
});

test('route inconnue : 404 au format JSON', async () => {
  const res = await request(app).get('/api/inexistante');
  expect(res.status).toBe(404);
  expect(res.body).toEqual({ error: expect.stringContaining('/api/inexistante') });
});

test('JSON mal formé : 400', async () => {
  const res = await request(app)
    .post('/api/health')
    .set('Content-Type', 'application/json')
    .send('{"a": ');
  expect(res.status).toBe(400);
  expect(res.body.error).toMatch(/JSON/);
});
