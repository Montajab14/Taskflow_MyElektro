const AppError = require('../utils/AppError');
const { STATUSES, PRIORITIES } = require('../models/Task');
const { isValidDateString } = require('../utils/date');

const SORTS = ['createdAt', '-createdAt', 'dueDate', '-dueDate', 'title', '-title', 'updatedAt', '-updatedAt'];

function checkTitle(value, errors) {
  if (typeof value !== 'string') {
    errors.push({ field: 'title', message: 'Le titre est obligatoire' });
    return undefined;
  }
  const title = value.trim();
  if (title.length < 1 || title.length > 120) {
    errors.push({ field: 'title', message: 'Le titre doit contenir entre 1 et 120 caractères' });
  }
  return title;
}

function checkStatus(value, errors) {
  if (!STATUSES.includes(value)) {
    errors.push({ field: 'status', message: `Le statut doit valoir ${STATUSES.join(', ')}` });
  }
  return value;
}

function checkDescription(value, errors) {
  if (typeof value !== 'string') {
    errors.push({ field: 'description', message: 'La description doit être une chaîne de caractères' });
  } else if (value.length > 1000) {
    errors.push({ field: 'description', message: 'La description ne doit pas dépasser 1000 caractères' });
  }
  return value;
}

function checkDueDate(value, errors) {
  if (value !== null && !isValidDateString(value)) {
    errors.push({ field: 'dueDate', message: "L'échéance doit être une date réelle au format YYYY-MM-DD, ou null" });
  }
  return value;
}

function checkPriority(value, errors) {
  if (!PRIORITIES.includes(value)) {
    errors.push({ field: 'priority', message: `La priorité doit valoir ${PRIORITIES.join(', ')}` });
  }
  return value;
}

const CHECKS = {
  title: checkTitle,
  status: checkStatus,
  description: checkDescription,
  dueDate: checkDueDate,
  priority: checkPriority,
};

/**
 * Valide le corps d'une tâche et renvoie uniquement les champs autorisés.
 * - partial = false (POST, PUT) : title et status sont obligatoires.
 * - partial = true (PATCH) : seuls les champs présents sont validés.
 * Les champs inconnus (owner, _id, completedAt...) sont ignorés : le client
 * ne peut pas réattribuer une tâche à un autre compte.
 */
function validateTask(body, { partial = false } = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw AppError.badRequest('Le corps de la requête doit être un objet JSON');
  }

  const errors = [];
  const data = {};

  for (const [field, check] of Object.entries(CHECKS)) {
    const present = body[field] !== undefined;
    const required = !partial && (field === 'title' || field === 'status');
    if (present || required) {
      data[field] = check(body[field], errors);
    }
  }

  if (partial && Object.keys(data).length === 0) {
    errors.push({ field: null, message: 'Aucun champ modifiable fourni' });
  }

  if (errors.length) throw AppError.badRequest('Données invalides', errors);
  return data;
}

/** Valide les paramètres de filtre de GET /api/tasks. */
function validateListQuery(query) {
  const errors = [];
  const filters = {};

  if (query.status !== undefined) {
    filters.status = String(query.status).split(',');
    filters.status.forEach((s) => checkStatus(s, errors));
  }
  if (query.priority !== undefined) {
    filters.priority = String(query.priority).split(',');
    filters.priority.forEach((p) => checkPriority(p, errors));
  }
  for (const key of ['dueBefore', 'dueAfter']) {
    if (query[key] !== undefined) {
      if (!isValidDateString(query[key])) {
        errors.push({ field: key, message: `${key} doit être une date au format YYYY-MM-DD` });
      }
      filters[key] = query[key];
    }
  }
  if (query.overdue !== undefined) {
    if (!['true', 'false'].includes(query.overdue)) {
      errors.push({ field: 'overdue', message: 'overdue doit valoir true ou false' });
    }
    filters.overdue = query.overdue === 'true';
  }
  if (query.q !== undefined) {
    filters.q = String(query.q).trim();
  }
  filters.sort = query.sort ?? '-createdAt';
  if (!SORTS.includes(filters.sort)) {
    errors.push({ field: 'sort', message: `sort doit valoir ${SORTS.join(', ')}` });
  }

  if (errors.length) throw AppError.badRequest('Paramètres de filtre invalides', errors);
  return filters;
}

module.exports = { validateTask, validateListQuery };
