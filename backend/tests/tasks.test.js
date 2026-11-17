const mongoose = require('mongoose');
const {
  setupDatabase, clearDatabase, teardownDatabase, api, createUser, reconnect,
} = require('./helpers');

beforeAll(setupDatabase);
afterEach(clearDatabase);
afterAll(teardownDatabase);

let auth;
beforeEach(async () => {
  ({ auth } = await createUser());
});

const createTask = (body) => api().post('/api/tasks').set('Authorization', auth).send(body);

describe('POST /api/tasks', () => {
  test('201 : tâche minimale, valeurs par défaut appliquées', async () => {
    const res = await createTask({ title: 'Faire les courses', status: 'todo' });
    expect(res.status).toBe(201);
    expect(res.headers.location).toBe(`/api/tasks/${res.body.id}`);
    expect(res.body).toEqual({
      id: expect.any(String),
      title: 'Faire les courses',
      description: '',
      status: 'todo',
      dueDate: null,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  test('201 : tâche complète, titre nettoyé de ses espaces', async () => {
    const res = await createTask({
      title: '  Préparer la soutenance  ',
      status: 'doing',
      description: 'Diapos + démo',
      dueDate: '2026-12-15',
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      title: 'Préparer la soutenance',
      status: 'doing',
      description: 'Diapos + démo',
      dueDate: '2026-12-15',
    });
  });

  test('201 : cas limites acceptés (titre de 120 caractères, description vide, 1000 caractères, dueDate null, 29 février bissextile)', async () => {
    const ok = [
      { title: 'a'.repeat(120), status: 'todo' },
      { title: 'x', status: 'todo', description: '' },
      { title: 'x', status: 'todo', description: 'd'.repeat(1000) },
      { title: 'x', status: 'todo', dueDate: null },
      { title: 'x', status: 'todo', dueDate: '2028-02-29' },
    ];
    for (const body of ok) {
      const res = await createTask(body);
      expect(res.status).toBe(201);
    }
  });

  test.each([
    ['titre absent', { status: 'todo' }, 'title'],
    ['titre vide', { title: '', status: 'todo' }, 'title'],
    ['titre composé d\'espaces', { title: '    ', status: 'todo' }, 'title'],
    ['titre de 121 caractères', { title: 'a'.repeat(121), status: 'todo' }, 'title'],
    ['titre non textuel', { title: 42, status: 'todo' }, 'title'],
    ['statut absent', { title: 'x' }, 'status'],
    ['statut inconnu', { title: 'x', status: 'finished' }, 'status'],
    ['description de 1001 caractères', { title: 'x', status: 'todo', description: 'd'.repeat(1001) }, 'description'],
    ['description null', { title: 'x', status: 'todo', description: null }, 'description'],
    ['dueDate au mauvais format', { title: 'x', status: 'todo', dueDate: '15/12/2026' }, 'dueDate'],
    ['dueDate avec heure', { title: 'x', status: 'todo', dueDate: '2026-12-15T10:00:00Z' }, 'dueDate'],
    ['dueDate inexistante (30 février)', { title: 'x', status: 'todo', dueDate: '2026-02-30' }, 'dueDate'],
    ['dueDate inexistante (29 février non bissextile)', { title: 'x', status: 'todo', dueDate: '2027-02-29' }, 'dueDate'],
    ['dueDate mois 13', { title: 'x', status: 'todo', dueDate: '2026-13-01' }, 'dueDate'],
  ])('400 : %s', async (_label, body, field) => {
    const res = await createTask(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toEqual(expect.any(String));
    expect(res.body.details.map((d) => d.field)).toContain(field);
  });

  test('400 : toutes les erreurs sont renvoyées en une fois', async () => {
    const res = await createTask({ title: '', status: 'nope', dueDate: 'demain' });
    expect(res.status).toBe(400);
    expect(res.body.details.map((d) => d.field).sort()).toEqual(['dueDate', 'status', 'title']);
  });

  test('400 : corps qui n\'est pas un objet', async () => {
    const res = await createTask([{ title: 'x', status: 'todo' }]);
    expect(res.status).toBe(400);
  });

  test('les champs non prévus (owner, id) sont ignorés', async () => {
    const otherId = new mongoose.Types.ObjectId().toString();
    const res = await createTask({
      title: 'x', status: 'todo', owner: otherId, id: otherId,
    });
    expect(res.status).toBe(201);
    expect(res.body.id).not.toBe(otherId);
    const list = await api().get('/api/tasks').set('Authorization', auth);
    expect(list.body).toHaveLength(1);
  });
});

describe('GET /api/tasks et /api/tasks/:id', () => {
  test('200 : liste vide au départ', async () => {
    const res = await api().get('/api/tasks').set('Authorization', auth);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('200 : liste triée de la plus récente à la plus ancienne', async () => {
    await createTask({ title: 'Première', status: 'todo' });
    await createTask({ title: 'Deuxième', status: 'todo' });
    const res = await api().get('/api/tasks').set('Authorization', auth);
    expect(res.body.map((t) => t.title)).toEqual(['Deuxième', 'Première']);
  });

  test('200 : détail d\'une tâche', async () => {
    const created = await createTask({ title: 'Détail', status: 'todo' });
    const res = await api().get(`/api/tasks/${created.body.id}`).set('Authorization', auth);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(created.body);
  });

  test('404 : identifiant inexistant', async () => {
    const id = new mongoose.Types.ObjectId();
    const res = await api().get(`/api/tasks/${id}`).set('Authorization', auth);
    expect(res.status).toBe(404);
  });

  test('404 : identifiant mal formé', async () => {
    const res = await api().get('/api/tasks/pas-un-id').set('Authorization', auth);
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/tasks/:id', () => {
  test('200 : remplace la tâche ; les champs facultatifs absents sont remis à zéro', async () => {
    const created = await createTask({
      title: 'Avant', status: 'todo', description: 'desc', dueDate: '2026-12-01',
    });
    const res = await api()
      .put(`/api/tasks/${created.body.id}`)
      .set('Authorization', auth)
      .send({ title: 'Après', status: 'doing' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: created.body.id, title: 'Après', status: 'doing', description: '', dueDate: null,
    });
  });

  test('400 : PUT sans les champs obligatoires', async () => {
    const created = await createTask({ title: 'x', status: 'todo' });
    const res = await api()
      .put(`/api/tasks/${created.body.id}`)
      .set('Authorization', auth)
      .send({ description: 'seulement' });
    expect(res.status).toBe(400);
    expect(res.body.details.map((d) => d.field).sort()).toEqual(['status', 'title']);
  });

  test('404 : tâche inexistante', async () => {
    const res = await api()
      .put(`/api/tasks/${new mongoose.Types.ObjectId()}`)
      .set('Authorization', auth)
      .send({ title: 'x', status: 'todo' });
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/tasks/:id', () => {
  test('200 : ne modifie que les champs fournis', async () => {
    const created = await createTask({ title: 'Garder', status: 'todo', description: 'garder aussi' });
    const res = await api()
      .patch(`/api/tasks/${created.body.id}`)
      .set('Authorization', auth)
      .send({ status: 'doing' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ title: 'Garder', status: 'doing', description: 'garder aussi' });
  });

  test('200 : dueDate peut être remise à null', async () => {
    const created = await createTask({ title: 'x', status: 'todo', dueDate: '2026-12-01' });
    const res = await api()
      .patch(`/api/tasks/${created.body.id}`)
      .set('Authorization', auth)
      .send({ dueDate: null });
    expect(res.body.dueDate).toBeNull();
  });

  test('400 : corps vide', async () => {
    const created = await createTask({ title: 'x', status: 'todo' });
    const res = await api().patch(`/api/tasks/${created.body.id}`).set('Authorization', auth).send({});
    expect(res.status).toBe(400);
  });

  test('400 : valeur invalide', async () => {
    const created = await createTask({ title: 'x', status: 'todo' });
    const res = await api()
      .patch(`/api/tasks/${created.body.id}`)
      .set('Authorization', auth)
      .send({ title: '   ' });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/tasks/:id', () => {
  test('204 puis 404 : la tâche n\'existe plus', async () => {
    const created = await createTask({ title: 'À supprimer', status: 'todo' });
    const url = `/api/tasks/${created.body.id}`;

    const del = await api().delete(url).set('Authorization', auth);
    expect(del.status).toBe(204);
    expect(del.text).toBe('');

    expect((await api().get(url).set('Authorization', auth)).status).toBe(404);
    expect((await api().delete(url).set('Authorization', auth)).status).toBe(404);
  });
});

describe('Persistance', () => {
  test('les tâches survivent à une reconnexion à la base', async () => {
    await createTask({ title: 'Persistante', status: 'todo' });
    await reconnect();

    const res = await api().get('/api/tasks').set('Authorization', auth);
    expect(res.body.map((t) => t.title)).toEqual(['Persistante']);
  });
});
