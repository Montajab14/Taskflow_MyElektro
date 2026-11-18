#!/usr/bin/env node
// Lance tout TaskFlow (MongoDB, API, front, Mongo Express) en une commande : npm start
//   npm start      prépare le .env si besoin, démarre Docker et les conteneurs
//   npm stop       arrête les conteneurs (les données sont conservées)
//   npm run logs   affiche les journaux en direct
// Aucune dépendance : seulement Node.js et Docker.
const { spawnSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const net = require('net');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ENV_FILE = path.join(ROOT, '.env');
const EXAMPLE_FILE = path.join(ROOT, '.env.example');
const isWindows = process.platform === 'win32';

const say = (msg) => console.log(`\x1b[36m›\x1b[0m ${msg}`);
const fail = (msg) => {
  console.error(`\x1b[31m✗\x1b[0m ${msg}`);
  process.exit(1);
};

/** Lance une commande ; renvoie true si elle a réussi. */
function run(cmd, args, { quiet = false } = {}) {
  const res = spawnSync(cmd, args, { cwd: ROOT, stdio: quiet ? 'ignore' : 'inherit', shell: isWindows });
  return res.status === 0;
}

// ---------- Fichier .env ----------
function readEnv() {
  if (!fs.existsSync(ENV_FILE)) return null;
  const values = {};
  for (const line of fs.readFileSync(ENV_FILE, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m) values[m[1]] = m[2].trim(); // une valeur plus bas dans le fichier l'emporte, comme pour docker compose
  }
  return values;
}

/** Donne une valeur à une variable du .env : remplace sa ligne, ou l'ajoute à la fin. */
function setEnv(key, value) {
  const lines = fs.readFileSync(ENV_FILE, 'utf8').split(/\r?\n/);
  let found = false;
  const out = [];
  for (const line of lines) {
    if (new RegExp(`^\\s*#?\\s*${key}\\s*=`).test(line)) {
      if (!found) out.push(`${key}=${value}`);
      found = true;
    } else out.push(line);
  }
  if (!found) {
    while (out.length && out[out.length - 1] === '') out.pop();
    out.push(`${key}=${value}`, '');
  }
  fs.writeFileSync(ENV_FILE, out.join('\n'));
}

const isFree = (port) => new Promise((resolve) => {
  const srv = net.createServer();
  srv.once('error', () => resolve(false));
  srv.once('listening', () => srv.close(() => resolve(true)));
  srv.listen(port, '0.0.0.0');
});

async function prepareEnv() {
  if (!fs.existsSync(ENV_FILE)) {
    fs.copyFileSync(EXAMPLE_FILE, ENV_FILE);
    say('Fichier .env créé à partir de .env.example');
  }
  const env = readEnv();
  if (!env.MONGO_ROOT_PASSWORD) {
    setEnv('MONGO_ROOT_PASSWORD', crypto.randomBytes(24).toString('hex'));
    say('Mot de passe MongoDB généré dans .env');
  }
  if (!env.JWT_SECRET) {
    setEnv('JWT_SECRET', crypto.randomBytes(48).toString('hex'));
    say('Secret JWT généré dans .env');
  }
  // Port de MongoDB sur la machine : choisi une fois, puis gardé dans .env
  if (!env.MONGO_PORT) {
    const ours = runningPort();
    let port = ours;
    if (!port) {
      port = 27017;
      while (!(await isFree(port))) port += 1;
    }
    setEnv('MONGO_PORT', String(port));
    if (port !== 27017) say(`Le port 27017 est déjà pris : MongoDB sera sur le port ${port}`);
  }
  return readEnv();
}

/** Port de la machine déjà publié par notre conteneur MongoDB, s'il tourne. */
function runningPort() {
  const res = spawnSync('docker', ['port', 'taskflow-mongodb', '27017'], { encoding: 'utf8', shell: isWindows });
  const m = res.status === 0 && res.stdout.match(/:(\d+)\s*$/m);
  return m ? Number(m[1]) : null;
}

// ---------- Docker ----------
function ensureDocker() {
  if (run('docker', ['info'], { quiet: true })) return;
  if (run('colima', ['version'], { quiet: true })) {
    say('Docker est arrêté : démarrage de Colima…');
    if (run('colima', ['start']) && run('docker', ['info'], { quiet: true })) return;
  }
  fail(isWindows || process.platform === 'darwin'
    ? 'Docker ne répond pas. Ouvrez Docker Desktop (ou lancez « colima start »), puis relancez npm start.'
    : 'Docker ne répond pas. Démarrez le service Docker, puis relancez npm start.');
}

/** « docker compose » si disponible, sinon l'ancien « docker-compose ». */
function composeCommand() {
  if (run('docker', ['compose', 'version'], { quiet: true })) return ['docker', ['compose']];
  if (run('docker-compose', ['version'], { quiet: true })) return ['docker-compose', []];
  return fail('Docker Compose est introuvable. Installez Docker Desktop, ou le paquet docker-compose.');
}

async function waitForApi(seconds) {
  for (let i = 0; i < seconds; i += 1) {
    try {
      const res = await fetch('http://localhost:3001/api/health');
      if (res.ok) return true;
    } catch { /* l'API démarre encore */ }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

// ---------- Commandes ----------
async function main() {
  const action = process.argv[2] || 'up';
  const env = action === 'up' ? await prepareEnv() : null;
  ensureDocker();
  const [bin, base] = composeCommand();
  const compose = (...args) => run(bin, [...base, ...args]);

  if (action === 'down') {
    compose('down');
    return say('Tout est arrêté. Les données de la base sont conservées.');
  }
  if (action === 'logs') return compose('logs', '-f', '--tail', '50');

  say('Construction et démarrage des conteneurs…');
  if (!compose('up', '-d', '--build')) fail('docker compose a échoué : voir le message ci-dessus.');

  say("Attente de l'API…");
  if (!(await waitForApi(60))) {
    fail("L'API ne répond pas après 60 s. Regardez ses journaux avec : npm run logs");
  }

  console.log(`
\x1b[32m✓ TaskFlow est lancé\x1b[0m

  Front              http://localhost:3000
  API                http://localhost:3001/api
  Swagger            http://localhost:3001/api/docs
  Mongo Express      http://localhost:8081
  MongoDB            localhost:${env.MONGO_PORT}

  Journaux : npm run logs     Arrêter : npm stop
`);
}

main().catch((err) => fail(err.message));
