const request = require('supertest');
const createApp = require('../src/app');
const { setupDatabase, clearDatabase, teardownDatabase } = require('./helpers');

beforeAll(setupDatabase);
afterEach(clearDatabase);
afterAll(teardownDatabase);

// Une app neuve par test : chaque test repart avec un compteur vide.
let app;
const credentials = { email: 'alice@test.dev', password: 'motdepasse123' };
const login = (password) => request(app).post('/api/auth/login').send({ ...credentials, password });

beforeEach(async () => {
  app = createApp({ authRateLimit: { max: 3, windowMs: 60 * 1000 } });
  await request(app).post('/api/auth/register').send(credentials);
});

test('429 après 3 mauvais mots de passe, au format d\'erreur de l\'API', async () => {
  for (let i = 0; i < 3; i += 1) {
    expect((await login('mauvais-mdp')).status).toBe(401);
  }
  const blocked = await login('mauvais-mdp');
  expect(blocked.status).toBe(429);
  expect(blocked.body).toEqual({ error: expect.stringMatching(/Trop de tentatives/) });
  expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
  expect(blocked.headers.ratelimit).toBeDefined();
});

test('une fois bloqué, même le bon mot de passe est refusé jusqu\'à la fin de la fenêtre', async () => {
  for (let i = 0; i < 3; i += 1) await login('mauvais-mdp');
  expect((await login(credentials.password)).status).toBe(429);
});

test('les connexions réussies ne comptent pas', async () => {
  for (let i = 0; i < 6; i += 1) {
    expect((await login(credentials.password)).status).toBe(200);
  }
});

test('les inscriptions en échec comptent aussi', async () => {
  // L'inscription du beforeEach a réussi : elle ne compte pas.
  for (let i = 0; i < 3; i += 1) {
    expect((await request(app).post('/api/auth/register').send(credentials)).status).toBe(409);
  }
  expect((await request(app).post('/api/auth/register').send(credentials)).status).toBe(429);
});

test('les autres routes ne sont pas limitées', async () => {
  for (let i = 0; i < 3; i += 1) await login('mauvais-mdp');
  const { body } = await request(app).get('/api/health');
  expect(body).toEqual({ status: 'ok' });
  expect((await request(app).get('/api/auth/me')).status).toBe(401); // pas 429
});
