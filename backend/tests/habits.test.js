const mongoose = require('mongoose');
const { setupDatabase, clearDatabase, teardownDatabase, api, createUser } = require('./helpers');

beforeAll(setupDatabase);
afterEach(clearDatabase);
afterAll(teardownDatabase);

let auth;
beforeEach(async () => {
  ({ auth } = await createUser());
});

const createHabit = (body, token = auth) => api().post('/api/habits').set('Authorization', token).send(body);

describe('CRUD /api/habits', () => {
  test('201 : création, nom nettoyé, description vide par défaut', async () => {
    const res = await createHabit({ name: '  Lire 20 minutes  ' });
    expect(res.status).toBe(201);
    expect(res.headers.location).toBe(`/api/habits/${res.body.id}`);
    expect(res.body).toMatchObject({ id: expect.any(String), name: 'Lire 20 minutes', description: '' });
  });

  test.each([
    ['nom absent', {}, 'name'],
    ['nom vide', { name: '   ' }, 'name'],
    ['nom de 81 caractères', { name: 'a'.repeat(81) }, 'name'],
    ['nom non textuel', { name: 3 }, 'name'],
    ['description de 501 caractères', { name: 'x', description: 'd'.repeat(501) }, 'description'],
  ])('400 : %s', async (_label, body, field) => {
    const res = await createHabit(body);
    expect(res.status).toBe(400);
    expect(res.body.details.map((d) => d.field)).toContain(field);
  });

  test('liste dans l\'ordre de création, détail, PATCH puis PUT', async () => {
    const { body: a } = await createHabit({ name: 'Sport', description: '30 min' });
    await createHabit({ name: 'Méditer' });

    const list = await api().get('/api/habits').set('Authorization', auth);
    expect(list.status).toBe(200);
    expect(list.body.map((h) => h.name)).toEqual(['Sport', 'Méditer']);

    const detail = await api().get(`/api/habits/${a.id}`).set('Authorization', auth);
    expect(detail.body.name).toBe('Sport');

    const patched = await api().patch(`/api/habits/${a.id}`).set('Authorization', auth).send({ name: 'Course' });
    expect(patched.body).toMatchObject({ name: 'Course', description: '30 min' });

    const replaced = await api().put(`/api/habits/${a.id}`).set('Authorization', auth).send({ name: 'Vélo' });
    expect(replaced.body).toMatchObject({ name: 'Vélo', description: '' });
  });

  test('400 : PATCH vide', async () => {
    const { body: h } = await createHabit({ name: 'x' });
    const res = await api().patch(`/api/habits/${h.id}`).set('Authorization', auth).send({});
    expect(res.status).toBe(400);
  });

  test('204 puis 404 après suppression', async () => {
    const { body: h } = await createHabit({ name: 'x' });
    const url = `/api/habits/${h.id}`;
    expect((await api().delete(url).set('Authorization', auth)).status).toBe(204);
    expect((await api().get(url).set('Authorization', auth)).status).toBe(404);
  });

  test('404 : identifiant inexistant ou mal formé', async () => {
    const missing = await api().get(`/api/habits/${new mongoose.Types.ObjectId()}`).set('Authorization', auth);
    const malformed = await api().get('/api/habits/pas-un-id').set('Authorization', auth);
    expect(missing.status).toBe(404);
    expect(malformed.status).toBe(404);
  });

  test('401 sans jeton', async () => {
    expect((await api().get('/api/habits')).status).toBe(401);
  });
});

describe('Isolation des habitudes', () => {
  let bob;
  let aliceHabit;
  beforeEach(async () => {
    bob = await createUser();
    ({ body: aliceHabit } = await createHabit({ name: 'Habitude d\'Alice' }));
  });

  test('Bob ne voit pas les habitudes d\'Alice', async () => {
    const res = await api().get('/api/habits').set('Authorization', bob.auth);
    expect(res.body).toEqual([]);
  });

  test('Bob reçoit 404 en lecture, modification et suppression', async () => {
    const url = `/api/habits/${aliceHabit.id}`;
    expect((await api().get(url).set('Authorization', bob.auth)).status).toBe(404);
    expect((await api().put(url).set('Authorization', bob.auth).send({ name: 'Piraté' })).status).toBe(404);
    expect((await api().patch(url).set('Authorization', bob.auth).send({ name: 'Piraté' })).status).toBe(404);
    expect((await api().delete(url).set('Authorization', bob.auth)).status).toBe(404);

    const check = await api().get(url).set('Authorization', auth);
    expect(check.body.name).toBe('Habitude d\'Alice');
  });
});
