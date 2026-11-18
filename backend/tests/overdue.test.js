/*
 * « En retard » dépend du jour courant, qui n'est pas le même partout.
 * Pour un test qui ne dépend pas de l'heure à laquelle il tourne, on prend
 * les deux fuseaux extrêmes : Etc/GMT+12 (UTC-12, le plus en retard) et
 * Pacific/Kiritimati (UTC+14, le plus en avance). 26 heures les séparent :
 * à Kiritimati, on est toujours au moins le lendemain d'Etc/GMT+12.
 */
const { todayIn } = require('../src/utils/date');
const { setupDatabase, clearDatabase, teardownDatabase, api, createUser } = require('./helpers');

beforeAll(setupDatabase);
afterEach(clearDatabase);
afterAll(teardownDatabase);

const LATE_TZ = 'Etc/GMT+12';
const EARLY_TZ = 'Pacific/Kiritimati';

let auth;
beforeEach(async () => {
  ({ auth } = await createUser());
  // Échéance = aujourd'hui dans le fuseau le plus en retard.
  await api().post('/api/tasks').set('Authorization', auth)
    .send({ title: 'Échéance aujourd\'hui à UTC-12', status: 'todo', dueDate: todayIn(LATE_TZ) });
});

const overdueTitles = async (tz) => {
  const res = await api().get('/api/tasks').query({ overdue: 'true', tz }).set('Authorization', auth);
  expect(res.status).toBe(200);
  return res.body.map((t) => t.title);
};

test('GET /api/tasks?overdue=true suit le fuseau tz', async () => {
  expect(await overdueTitles(LATE_TZ)).toEqual([]); // échéance = aujourd'hui : pas en retard
  expect(await overdueTitles(EARLY_TZ)).toHaveLength(1); // déjà le lendemain : en retard
});

test('GET /api/stats/summary compte les retards dans le fuseau tz', async () => {
  const summary = (tz) => api().get('/api/stats/summary').query({ tz }).set('Authorization', auth);
  expect((await summary(LATE_TZ)).body.overdue).toBe(0);
  expect((await summary(EARLY_TZ)).body.overdue).toBe(1);
});

test('sans tz, la référence reste UTC', async () => {
  const res = await api().get('/api/tasks?overdue=true').set('Authorization', auth);
  const expected = todayIn(LATE_TZ) < todayIn('UTC') ? 1 : 0;
  expect(res.body).toHaveLength(expected);
});

test('400 : fuseau inconnu', async () => {
  expect((await api().get('/api/tasks?tz=Mars/Olympus').set('Authorization', auth)).status).toBe(400);
  expect((await api().get('/api/stats/summary?tz=Mars/Olympus').set('Authorization', auth)).status).toBe(400);
});
