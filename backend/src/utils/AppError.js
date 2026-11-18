/**
 * Erreur métier transportant son code HTTP.
 * Le middleware d'erreurs la transforme en réponse JSON.
 */
class AppError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    if (details) this.details = details;
  }

  static badRequest(message, details) {
    return new AppError(400, message, details);
  }

  static unauthorized(message = 'Authentification requise') {
    return new AppError(401, message);
  }

  static notFound(message = 'Ressource introuvable') {
    return new AppError(404, message);
  }

  static tooManyRequests(message) {
    return new AppError(429, message);
  }

  static conflict(message) {
    return new AppError(409, message);
  }
}

module.exports = AppError;
