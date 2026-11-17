const AppError = require('../utils/AppError');
const authService = require('../services/auth.service');

/**
 * Exige un en-tête "Authorization: Bearer <jwt>".
 * En cas de succès, req.user = { id, email, name } : c'est cet id, et lui seul,
 * qui sert ensuite à filtrer les tâches. Le client ne choisit jamais le propriétaire.
 */
async function requireAuth(req, res, next) {
  const header = req.get('Authorization') || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(AppError.unauthorized('Jeton manquant : en-tête Authorization: Bearer <token> attendu'));
  }

  const user = await authService.verifyToken(token);
  req.user = { id: user.id, email: user.email, name: user.name ?? null };
  return next();
}

module.exports = requireAuth;
