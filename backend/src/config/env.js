require('dotenv').config({ quiet: true });

const env = process.env.NODE_ENV || 'development';

const config = {
  env,
  // 3001 par défaut : le serveur du front (src/index.js) occupe déjà le port 3000.
  port: Number(process.env.PORT) || 3001,
  // Même nom de variable que dans le .env.example et le docker-compose du dépôt.
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  // Liste d'origines séparées par des virgules : front actuel (3000) et front Vite (5173).
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS) || 10,
  // Échecs d'inscription ou de connexion tolérés par IP sur la fenêtre, avant un 429.
  authRateLimit: {
    max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 10,
    windowMs: (Number(process.env.AUTH_RATE_LIMIT_WINDOW_MIN) || 15) * 60 * 1000,
  },
};

// On refuse de démarrer sans secret : un JWT signé avec une valeur par défaut
// connue de tous ne protégerait rien.
if (!config.jwtSecret) {
  throw new Error('JWT_SECRET manquant : copiez .env.example en .env et renseignez-le.');
}

module.exports = config;
