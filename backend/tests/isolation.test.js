/*
 * Exigence centrale : un compte ne peut ni lire, ni modifier, ni supprimer
 * les tâches d'un autre, même en appelant l'API directement avec l'identifiant.
 */
const { setupDatabase, clearDatabase, teardownDatabase, api, createUser } = require('./helpers');

beforeAll(setupDatabase);
afterEach(clearDatabase);
afterAll(teardownDatabase);

let alice;
let bob;
let aliceTask;

beforeEach(async () => {
  alice = await createUser('alice@test.dev');
  bob = await createUser('bob@test.dev');
  const res = await api()
    .post('/api/tasks')
    .set('Authorization', alice.auth)
    .send({ title: 'Secret d\'Alice', status: 'todo', description: 'privé' });
  aliceTask = res.body;
});

test('la liste de Bob ne contient pas les tâches d\'Alice', async () => {
  await api().post('/api/tasks').set('Authorization', bob.auth).send({ title: 'Tâche de Bob', status: 'todo' });

  const bobList = await api().get('/api/tasks').set('Authorization', bob.auth);
  expect(bobList.body.map((t) => t.title)).toEqual(['Tâche de Bob']);

  const aliceList = await api().get('/api/tasks').set('Authorization', alice.auth);
  expect(aliceList.body.map((t) => t.title)).toEqual(['Secret d\'Alice']);
});

test('GET : Bob reçoit 404 sur la tâche d\'Alice, sans aucune donnée', async () => {
  const res = await api().get(`/api/tasks/${aliceTask.id}`).set('Authorization', bob.auth);
  expect(res.status).toBe(404);
  expect(JSON.stringify(res.body)).not.toMatch(/Secret|privé/);
});

test('PUT : Bob ne peut pas modifier la tâche d\'Alice', async () => {
  const res = await api()
    .put(`/api/tasks/${aliceTask.id}`)
    .set('Authorization', bob.auth)
    .send({ title: 'Piraté', status: 'done' });
  expect(res.status).toBe(404);

  const check = await api().get(`/api/tasks/${aliceTask.id}`).set('Authorization', alice.auth);
  expect(check.body).toMatchObject({ title: 'Secret d\'Alice', status: 'todo' });
});

test('PATCH : Bob ne peut pas modifier la tâche d\'Alice', async () => {
  const res = await api()
    .patch(`/api/tasks/${aliceTask.id}`)
    .set('Authorization', bob.auth)
    .send({ status: 'done' });
  expect(res.status).toBe(404);

  const check = await api().get(`/api/tasks/${aliceTask.id}`).set('Authorization', alice.auth);
  expect(check.body.status).toBe('todo');
});

test('DELETE : Bob ne peut pas supprimer la tâche d\'Alice', async () => {
  const res = await api().delete(`/api/tasks/${aliceTask.id}`).set('Authorization', bob.auth);
  expect(res.status).toBe(404);

  const check = await api().get(`/api/tasks/${aliceTask.id}`).set('Authorization', alice.auth);
  expect(check.status).toBe(200);
});

test('même réponse pour une tâche d\'autrui et une tâche inexistante', async () => {
  const foreign = await api().get(`/api/tasks/${aliceTask.id}`).set('Authorization', bob.auth);
  const missing = await api().get('/api/tasks/000000000000000000000000').set('Authorization', bob.auth);
  expect(foreign.status).toBe(missing.status);
  expect(foreign.body).toEqual(missing.body);
});

test('Bob ne peut pas créer une tâche au nom d\'Alice en envoyant "owner"', async () => {
  await api()
    .post('/api/tasks')
    .set('Authorization', bob.auth)
    .send({ title: 'Injectée', status: 'todo', owner: alice.user.id });

  const aliceList = await api().get('/api/tasks').set('Authorization', alice.auth);
  expect(aliceList.body.map((t) => t.title)).toEqual(['Secret d\'Alice']);
});

test('les statistiques de Bob ignorent les tâches d\'Alice', async () => {
  const res = await api().get('/api/stats/summary').set('Authorization', bob.auth);
  expect(res.body.total).toBe(0);
});

test('sans jeton, aucune route de tâches n\'est accessible', async () => {
  const calls = [
    api().get('/api/tasks'),
    api().post('/api/tasks').send({ title: 'x', status: 'todo' }),
    api().get(`/api/tasks/${aliceTask.id}`),
    api().put(`/api/tasks/${aliceTask.id}`).send({ title: 'x', status: 'todo' }),
    api().patch(`/api/tasks/${aliceTask.id}`).send({ status: 'done' }),
    api().delete(`/api/tasks/${aliceTask.id}`),
    api().get('/api/stats/summary'),
  ];
  const results = await Promise.all(calls);
  results.forEach((res) => expect(res.status).toBe(401));
});
