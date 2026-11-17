const Task = require('../src/models/Task');
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
