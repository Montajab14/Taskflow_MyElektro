const { computeStats } = require('../src/services/habit.service');
const { todayIn, addDays } = require('../src/utils/date');
const { setupDatabase, clearDatabase, teardownDatabase, api, createUser } = require('./helpers');

describe('computeStats', () => {
  const today = '2026-03-10';

  test('aucune réalisation', () => {
    expect(computeStats([], today)).toEqual({
      total: 0, currentStreak: 0, longestStreak: 0, lastCompletedOn: null, doneToday: false,
    });
  });

  test('série en cours jusqu\'à aujourd\'hui', () => {
    expect(computeStats(['2026-03-08', '2026-03-09', '2026-03-10'], today)).toMatchObject({
      currentStreak: 3, longestStreak: 3, doneToday: true,
    });
  });

  test('série jusqu\'à hier : pas encore rompue', () => {
    expect(computeStats(['2026-03-08', '2026-03-09'], today)).toMatchObject({
      currentStreak: 2, doneToday: false,
    });
  });

  test('dernier jour avant-hier : série rompue', () => {
    expect(computeStats(['2026-03-07', '2026-03-08'], today)).toMatchObject({ currentStreak: 0, longestStreak: 2 });
  });

  test('la plus longue série peut être ancienne', () => {
    const dates = ['2026-02-01', '2026-02-02', '2026-02-03', '2026-02-04', '2026-03-09', '2026-03-10'];
    expect(computeStats(dates, today)).toMatchObject({ total: 6, currentStreak: 2, longestStreak: 4 });
  });

  test('les séries traversent les fins de mois', () => {
    expect(computeStats(['2026-02-27', '2026-02-28', '2026-03-01'], '2026-03-01')).toMatchObject({
      currentStreak: 3, longestStreak: 3,
    });
  });
});

describe('GET /api/habits avec statistiques', () => {
  beforeAll(setupDatabase);
  afterEach(clearDatabase);
  afterAll(teardownDatabase);

  test('chaque habitude porte ses propres statistiques', async () => {
    const { auth } = await createUser();
    const create = (name) => api().post('/api/habits').set('Authorization', auth).send({ name });
    const { body: lire } = await create('Lire');
    await create('Sport');

    const today = todayIn('UTC');
    for (const d of [addDays(today, -2), addDays(today, -1), today]) {
      await api().put(`/api/habits/${lire.id}/completions/${d}`).set('Authorization', auth);
    }

    const list = await api().get('/api/habits').set('Authorization', auth);
    expect(list.status).toBe(200);
    const [l, s] = list.body;
    expect(l.stats).toEqual({
      total: 3, currentStreak: 3, longestStreak: 3, lastCompletedOn: today, doneToday: true,
    });
    expect(s.stats).toMatchObject({ total: 0, currentStreak: 0 });

    const detail = await api().get(`/api/habits/${lire.id}`).set('Authorization', auth);
    expect(detail.body.stats.currentStreak).toBe(3);
  });

  test('400 : fuseau inconnu', async () => {
    const { auth } = await createUser();
    expect((await api().get('/api/habits?tz=Nowhere').set('Authorization', auth)).status).toBe(400);
  });
});
