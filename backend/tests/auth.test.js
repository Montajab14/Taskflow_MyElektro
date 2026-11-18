const { setupDatabase, clearDatabase, teardownDatabase, api, createUser } = require('./helpers');

beforeAll(setupDatabase);
afterEach(clearDatabase);
afterAll(teardownDatabase);

describe('POST /api/auth/register', () => {
  test('201 : crée le compte et renvoie un JWT, sans le mot de passe', async () => {
    const res = await api()
      .post('/api/auth/register')
      .send({ email: 'Alice@Example.com ', password: 'motdepasse123' });

    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.token.split('.')).toHaveLength(3);
    expect(res.body.user).toEqual({
      id: expect.any(String),
      email: 'alice@example.com',
      name: null,
      createdAt: expect.any(String),
    });
    expect(JSON.stringify(res.body)).not.toMatch(/motdepasse123|passwordHash/);
  });

  test('le mot de passe est stocké hashé avec bcrypt', async () => {
    await createUser('bob@test.dev', 'motdepasse123');
    const User = require('../src/models/User');
    const user = await User.findOne({ email: 'bob@test.dev' }).select('+passwordHash');
    expect(user.passwordHash).not.toBe('motdepasse123');
    expect(user.passwordHash).toMatch(/^\$2[aby]\$/);
  });

  test('201 : nom facultatif, nettoyé de ses espaces', async () => {
    const res = await api()
      .post('/api/auth/register')
      .send({ email: 'dina@test.dev', password: 'motdepasse123', name: '  Dina Martin ' });
    expect(res.status).toBe(201);
    expect(res.body.user.name).toBe('Dina Martin');
  });

  test('409 : e-mail déjà utilisé (insensible à la casse)', async () => {
    await createUser('alice@test.dev');
    const res = await api()
      .post('/api/auth/register')
      .send({ email: 'ALICE@test.dev', password: 'motdepasse123' });
    expect(res.status).toBe(409);
    expect(res.body.error).toEqual(expect.any(String));
  });

  test.each([
    ['e-mail absent', { password: 'motdepasse123' }, 'email'],
    ['e-mail mal formé', { email: 'pas-un-email', password: 'motdepasse123' }, 'email'],
    ['mot de passe absent', { email: 'a@test.dev' }, 'password'],
    ['mot de passe trop court', { email: 'a@test.dev', password: 'court' }, 'password'],
    ['mot de passe non textuel', { email: 'a@test.dev', password: 12345678 }, 'password'],
    ['nom d\'un seul caractère', { email: 'a@test.dev', password: 'motdepasse123', name: 'A' }, 'name'],
    ['nom non textuel', { email: 'a@test.dev', password: 'motdepasse123', name: 42 }, 'name'],
  ])('400 : %s', async (_label, body, field) => {
    const res = await api().post('/api/auth/register').send(body);
    expect(res.status).toBe(400);
    expect(res.body.details.map((d) => d.field)).toContain(field);
  });

  test('400 : JSON mal formé', async () => {
    const res = await api()
      .post('/api/auth/register')
      .set('Content-Type', 'application/json')
      .send('{"email": ');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/JSON/);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(() => createUser('alice@test.dev', 'motdepasse123'));

  test('200 : identifiants corrects', async () => {
    const res = await api()
      .post('/api/auth/login')
      .send({ email: 'alice@test.dev', password: 'motdepasse123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user.email).toBe('alice@test.dev');
  });

  test('401 : mauvais mot de passe', async () => {
    const res = await api()
      .post('/api/auth/login')
      .send({ email: 'alice@test.dev', password: 'mauvais-mdp' });
    expect(res.status).toBe(401);
  });

  test('401 : e-mail inconnu, même message que pour un mauvais mot de passe', async () => {
    const unknown = await api()
      .post('/api/auth/login')
      .send({ email: 'inconnu@test.dev', password: 'motdepasse123' });
    const wrong = await api()
      .post('/api/auth/login')
      .send({ email: 'alice@test.dev', password: 'mauvais-mdp' });
    expect(unknown.status).toBe(401);
    expect(unknown.body.error).toBe(wrong.body.error);
  });

  test('400 : champs manquants', async () => {
    const res = await api().post('/api/auth/login').send({});
    expect(res.status).toBe(400);
  });
});

describe('Middleware Bearer', () => {
  test('GET /api/auth/me renvoie le compte du jeton', async () => {
    const { auth, user } = await createUser('carol@test.dev');
    const res = await api().get('/api/auth/me').set('Authorization', auth);
    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({ id: user.id, email: 'carol@test.dev', name: null });
  });

  test.each([
    ['sans en-tête', undefined],
    ['schéma autre que Bearer', 'Basic abc'],
    ['Bearer sans jeton', 'Bearer '],
    ['jeton falsifié', 'Bearer abc.def.ghi'],
  ])('401 : %s', async (_label, header) => {
    const req = api().get('/api/auth/me');
    if (header !== undefined) req.set('Authorization', header);
    const res = await req;
    expect(res.status).toBe(401);
  });

  test('401 : jeton signé avec un autre secret', async () => {
    const jwt = require('jsonwebtoken');
    const { user } = await createUser();
    const forged = jwt.sign({ sub: user.id }, 'autre-secret');
    const res = await api().get('/api/auth/me').set('Authorization', `Bearer ${forged}`);
    expect(res.status).toBe(401);
  });

  test('401 : jeton expiré', async () => {
    const jwt = require('jsonwebtoken');
    const { user } = await createUser();
    const expired = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: -10 });
    const res = await api().get('/api/auth/me').set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
  });
});
