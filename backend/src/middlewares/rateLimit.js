const { rateLimit } = require('express-rate-limit');
const AppError = require('../utils/AppError');

/**
 * Limite les tentatives d'inscription et de connexion par adresse IP, pour
 * empêcher d'essayer des mots de passe en boucle.
 * Seules les requêtes en échec comptent (skipSuccessfulRequests) : un
 * utilisateur qui se connecte normalement n'est jamais bloqué.
 * Au-delà de max échecs sur la fenêtre, l'API répond 429 avec Retry-After.
 */
function createAuthLimiter({ max, windowMs }) {
  return rateLimit({
    windowMs,
    limit: max,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler(req, res, next) {
      const seconds = Math.max(1, Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000));
      res.set('Retry-After', String(seconds));
      next(AppError.tooManyRequests(`Trop de tentatives. Réessayez dans ${Math.ceil(seconds / 60)} minute(s).`));
    },
  });
}

module.exports = { createAuthLimiter };
