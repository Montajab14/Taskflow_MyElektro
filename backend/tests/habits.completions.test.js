const { todayIn, addDays } = require('../src/utils/date');
const { setupDatabase, clearDatabase, teardownDatabase, api, createUser } = require('./helpers');

beforeAll(setupDatabase);
afterEach(clearDatabase);
afterAll(teardownDatabase);

let auth;
let habit;
beforeEach(async () => {
  ({ auth } = await createUser());
  ({ body: habit } = await api().post('/api/habits').set('Authorization', auth).send({ name: 'Lire' }));
});

const url = (date = '') => `/api/habits/${habit.id}/completions${date ? `/${date}` : ''}`;
const check = (date, token = auth) => api().put(url(date)).set('Authorization', token);

describe('Réalisations datées', () => {
  test('201 au premier marquage, 200 ensuite (idempotent)', async () => {
    const first = await check('2026-03-02');
    expect(first.status).toBe(201);
    expect(first.body).toEqual({ date: '2026-03-02', createdAt: expect.any(String) });

    const again = await check('2026-03-02');
    expect(again.status).toBe(200);
    expect(again.body.createdAt).toBe(first.body.createdAt);

    const list = await api().get(url()).set('Authorization', auth);
    expect(list.body).toHaveLength(1);
  });

  test('marquages simultanés du même jour : une seule réalisation', async () => {
    const results = await Promise.all([check('2026-03-02'), check('2026-03-02'), check('2026-03-02')]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 200, 201]);
    const list = await api().get(url()).set('Authorization', auth);
    expect(list.body).toHaveLength(1);
  });

  test('liste triée par date, filtrable par période', async () => {
    for (const d of ['2026-03-05', '2026-03-01', '2026-03-03']) await check(d);

    const all = await api().get(url()).set('Authorization', auth);
    expect(all.body.map((c) => c.date)).toEqual(['2026-03-01', '2026-03-03', '2026-03-05']);

    const some = await api().get(`${url()}?from=2026-03-02&to=2026-03-04`).set('Authorization', auth);
    expect(some.body.map((c) => c.date)).toEqual(['2026-03-03']);
  });

  test('204 au décochage, puis 404', async () => {
    await check('2026-03-02');
    expect((await api().delete(url('2026-03-02')).set('Authorization', auth)).status).toBe(204);
    expect((await api().delete(url('2026-03-02')).set('Authorization', auth)).status).toBe(404);
  });

  test('aujourd\'hui est accepté, demain refusé', async () => {
    const today = todayIn('UTC');
    expect((await check(today)).status).toBe(201);
    const tomorrow = await check(addDays(today, 1));
    expect(tomorrow.status).toBe(400);
    expect(tomorrow.body.details[0].field).toBe('date');
  });

  test('« aujourd\'hui » suit le fuseau tz', async () => {
    // Le jour le plus en avance au monde (UTC+14) : son « aujourd'hui » n'est
    // jamais refusé, alors qu'en UTC il peut déjà être demain.
    const kiritimati = todayIn('Pacific/Kiritimati');
    const res = await api().put(`${url(kiritimati)}?tz=Pacific/Kiritimati`).set('Authorization', auth);
    expect(res.status).toBe(201);
  });

  test.each([
    ['date inexistante', '2026-02-30'],
    ['mauvais format', '02-03-2026'],
  ])('400 : %s', async (_label, date) => {
    expect((await check(date)).status).toBe(400);
  });

  test('400 : fuseau inconnu ou période inversée', async () => {
    expect((await api().put(`${url('2026-03-02')}?tz=Mars/Olympus`).set('Authorization', auth)).status).toBe(400);
    expect((await api().get(`${url()}?from=2026-03-05&to=2026-03-01`).set('Authorization', auth)).status).toBe(400);
  });

  test('supprimer l\'habitude supprime ses réalisations', async () => {
    await check('2026-03-02');
    await api().delete(`/api/habits/${habit.id}`).set('Authorization', auth);
    const HabitCompletion = require('../src/models/HabitCompletion');
    expect(await HabitCompletion.countDocuments()).toBe(0);
  });

  test('isolation : Bob ne peut ni lire, ni cocher, ni décocher l\'habitude d\'Alice', async () => {
    await check('2026-03-02');
    const bob = await createUser();
    expect((await api().get(url()).set('Authorization', bob.auth)).status).toBe(404);
    expect((await check('2026-03-03', bob.auth)).status).toBe(404);
    expect((await api().delete(url('2026-03-02')).set('Authorization', bob.auth)).status).toBe(404);

    const list = await api().get(url()).set('Authorization', auth);
    expect(list.body.map((c) => c.date)).toEqual(['2026-03-02']);
  });
});
