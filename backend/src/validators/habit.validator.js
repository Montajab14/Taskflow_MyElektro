const AppError = require('../utils/AppError');

function checkName(value, errors) {
  if (typeof value !== 'string') {
    errors.push({ field: 'name', message: 'Le nom est obligatoire' });
    return undefined;
  }
  const name = value.trim();
  if (name.length < 1 || name.length > 80) {
    errors.push({ field: 'name', message: 'Le nom doit contenir entre 1 et 80 caractères' });
  }
  return name;
}

function checkDescription(value, errors) {
  if (typeof value !== 'string') {
    errors.push({ field: 'description', message: 'La description doit être une chaîne de caractères' });
  } else if (value.length > 500) {
    errors.push({ field: 'description', message: 'La description ne doit pas dépasser 500 caractères' });
  }
  return value;
}

const CHECKS = { name: checkName, description: checkDescription };

/**
 * Valide le corps d'une habitude et ne garde que les champs autorisés.
 * partial = false (POST, PUT) : name obligatoire. partial = true (PATCH) :
 * seuls les champs présents sont validés.
 */
function validateHabit(body, { partial = false } = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw AppError.badRequest('Le corps de la requête doit être un objet JSON');
  }

  const errors = [];
  const data = {};
  for (const [field, check] of Object.entries(CHECKS)) {
    if (body[field] !== undefined || (!partial && field === 'name')) {
      data[field] = check(body[field], errors);
    }
  }
  if (partial && Object.keys(data).length === 0) {
    errors.push({ field: null, message: 'Aucun champ modifiable fourni' });
  }

  if (errors.length) throw AppError.badRequest('Données invalides', errors);
  return data;
}

module.exports = { validateHabit };
