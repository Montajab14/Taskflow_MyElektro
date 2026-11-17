const AppError = require('../utils/AppError');

function notFound(req, res, next) {
  next(AppError.notFound(`Route introuvable : ${req.method} ${req.originalUrl}`));
}

module.exports = notFound;
