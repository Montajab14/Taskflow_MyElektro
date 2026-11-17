const mongoose = require('mongoose');
const AppError = require('../utils/AppError');

/**
 * Point de sortie unique des erreurs. Format de réponse :
 *   { "error": "message", "details": [{ "field": "title", "message": "..." }] }
 * "details" n'apparaît que pour les erreurs de validation.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let error = err;

  // Corps JSON mal formé (renvoyé par express.json)
  if (err.type === 'entity.parse.failed') {
    error = AppError.badRequest('Corps de requête JSON invalide');
  } else if (err.type === 'entity.too.large') {
    error = new AppError(413, 'Corps de requête trop volumineux');
  } else if (err instanceof mongoose.Error.ValidationError) {
    error = AppError.badRequest(
      'Données invalides',
      Object.values(err.errors).map((e) => ({ field: e.path, message: e.message })),
    );
  } else if (err instanceof mongoose.Error.CastError) {
    error = AppError.notFound();
  }

  if (!(error instanceof AppError)) {
    console.error(err);
    error = new AppError(500, 'Erreur interne du serveur');
  }

  const body = { error: error.message };
  if (error.details) body.details = error.details;
  res.status(error.status).json(body);
}

module.exports = errorHandler;
