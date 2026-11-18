const os = require('os');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const request = require('supertest');
const createApp = require('../src/app');

let mongod;

// Le driver MongoDB 7 charge le module "os" via un import() dynamique, que la
// machine virtuelle de Jest refuse : on lui fournit le module directement.
const connectOptions = { runtimeAdapters: { os } };

/** Base MongoDB jetable, en mémoire, propre à chaque fichier de test. */
async function setupDatabase() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), connectOptions);
}

async function clearDatabase() {
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
}

async function teardownDatabase() {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
}

const app = createApp();
const api = () => request(app);

let counter = 0;
/** Crée un compte et renvoie { token, user, auth } où auth est l'en-tête Authorization. */
async function createUser(email = `user${(counter += 1)}@test.dev`, password = 'motdepasse123') {
  const res = await api().post('/api/auth/register').send({ email, password });
  if (res.status !== 201) throw new Error(`Inscription impossible : ${JSON.stringify(res.body)}`);
  return { ...res.body, auth: `Bearer ${res.body.token}` };
}

/** Ferme puis rouvre la connexion, comme au redémarrage de l'API. */
async function reconnect() {
  await mongoose.disconnect();
  await mongoose.connect(mongod.getUri(), connectOptions);
}

module.exports = {
  setupDatabase, clearDatabase, teardownDatabase, api, createUser, reconnect,
};
