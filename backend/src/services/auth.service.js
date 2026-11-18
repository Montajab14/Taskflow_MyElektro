const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const User = require('../models/User');
const AppError = require('../utils/AppError');

// Hash factice comparé quand l'e-mail n'existe pas : la réponse prend le même
// temps, ce qui empêche de deviner quels e-mails ont un compte.
const DUMMY_HASH = bcrypt.hashSync('taskflow-dummy-password', 10);

function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

async function register({ email, password, name }) {
  if (await User.exists({ email })) {
    throw AppError.conflict('Un compte existe déjà avec cet e-mail');
  }
  const passwordHash = await bcrypt.hash(password, config.bcryptRounds);
  let user;
  try {
    user = await User.create({ email, name, passwordHash });
  } catch (err) {
    // Deux inscriptions simultanées : l'index unique tranche.
    if (err.code === 11000) throw AppError.conflict('Un compte existe déjà avec cet e-mail');
    throw err;
  }
  return { token: signToken(user), user };
}

async function login({ email, password }) {
  const user = await User.findOne({ email }).select('+passwordHash');
  const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
  if (!user || !ok) {
    throw AppError.unauthorized('E-mail ou mot de passe incorrect');
  }
  return { token: signToken(user), user };
}

/** Vérifie la signature et l'expiration du JWT, puis que le compte existe toujours. */
async function verifyToken(token) {
  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    throw AppError.unauthorized('Jeton invalide ou expiré');
  }
  const user = await User.findById(payload.sub);
  if (!user) throw AppError.unauthorized('Jeton invalide ou expiré');
  return user;
}

module.exports = { register, login, verifyToken };
