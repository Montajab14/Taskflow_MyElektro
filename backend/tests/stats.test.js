const Task = require('../src/models/Task');
const { todayIn } = require('../src/services/stats.service');
const { setupDatabase, clearDatabase, teardownDatabase, api, createUser } = require('./helpers');

beforeAll(setupDatabase);
afterEach(clearDatabase);
afterAll(teardownDatabase);

let user;
beforeEach(async () => {
  user = await createUser();
});

const get = (url) => api().get(url).set('Authorization', user.auth);

/** Insère directement en base pour maîtriser les dates. */
const insert = (fields) => Task.create({ owner: user.user.id, title: 't', status: 'todo', ...fields });

describe('GET /api/stats/summary', () => {
  test('compteurs par statut, priorité, retard et taux de complétion', async () => {
    await insert({ status: 'todo', priority: 'high', dueDate: '2020-01-01' });
    await insert({ status: 'doing', priority: 'low' });
    await insert({ status: 'done', priority: 'high', dueDate: '2020-01-01', completedAt: new Date() });
    await insert({ status: 'done', completedAt: new Date() });

    const res = await get('/api/stats/summary');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      total: 4,
      byStatus: { todo: 1, doing: 1, done: 2 },
      byPriority: { low: 1, medium: 1, high: 2 },
      overdue: 1,
      completionRate: 0.5,
    });
  });

  test('compte vide', async () => {
    const res = await get('/api/stats/summary');
    expect(res.body).toMatchObject({ total: 0, completionRate: 0, overdue: 0 });
  });
});

describe('GET /api/stats/heatmap', () => {
  test('compte les tâches terminées par jour, jours vides inclus', async () => {
    await insert({ status: 'done', completedAt: new Date('2026-03-02T10:00:00Z') });
    await insert({ status: 'done', completedAt: new Date('2026-03-02T18:00:00Z') });
    await insert({ status: 'done', completedAt: new Date('2026-03-04T09:00:00Z') });
    await insert({ status: 'done', completedAt: new Date('2026-04-01T09:00:00Z') }); // hors période

    const res = await get('/api/stats/heatmap?from=2026-03-01&to=2026-03-05');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      from: '2026-03-01',
      to: '2026-03-05',
      timezone: 'UTC',
      total: 3,
      max: 2,
      days: [
        { date: '2026-03-01', count: 0 },
        { date: '2026-03-02', count: 2 },
        { date: '2026-03-03', count: 0 },
        { date: '2026-03-04', count: 1 },
        { date: '2026-03-05', count: 0 },
      ],
    });
  });

  test('le fuseau horaire décale le jour', async () => {
    // 23h30 UTC le 2 mars = 00h30 le 3 mars à Paris
    await insert({ status: 'done', completedAt: new Date('2026-03-02T23:30:00Z') });

    const utc = await get('/api/stats/heatmap?from=2026-03-02&to=2026-03-03');
    const paris = await get('/api/stats/heatmap?from=2026-03-02&to=2026-03-03&tz=Europe/Paris');
    expect(utc.body.days.map((d) => d.count)).toEqual([1, 0]);
    expect(paris.body.days.map((d) => d.count)).toEqual([0, 1]);
  });

  test('par défaut : les 365 derniers jours', async () => {
    const res = await get('/api/stats/heatmap');
    expect(res.status).toBe(200);
    expect(res.body.days).toHaveLength(365);
    expect(res.body.to).toBe(todayIn('UTC'));
  });

  test.each([
    ['from=2026-02-30'],
    ['from=2026-03-05&to=2026-03-01'],
    ['from=2020-01-01&to=2026-01-01'],
    ['tz=Mars/Olympus'],
  ])('400 : %s', async (query) => {
    const res = await get(`/api/stats/heatmap?${query}`);
    expect(res.status).toBe(400);
  });
});
