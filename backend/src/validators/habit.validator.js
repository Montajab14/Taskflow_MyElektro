const AppError = require('../utils/AppError');
const { isValidDateString, isValidTimezone, todayIn } = require('../utils/date');

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

function checkTimezone(tz, errors) {
  if (!isValidTimezone(tz)) {
    errors.push({ field: 'tz', message: 'Fuseau horaire inconnu (ex. : Europe/Paris)' });
  }
}

/**
 * Jour d'une réalisation (paramètre :date). Refuse les jours futurs : on ne
 * coche pas une habitude à l'avance. « Aujourd'hui » dépend du fuseau tz.
 */
function validateCompletionDate(date, query = {}) {
  const errors = [];
  const timezone = query.tz ?? 'UTC';
  checkTimezone(timezone, errors);

  if (!isValidDateString(date)) {
    errors.push({ field: 'date', message: 'La date doit être une date réelle au format YYYY-MM-DD' });
  } else if (!errors.length && date > todayIn(timezone)) {
    errors.push({ field: 'date', message: 'Impossible de valider une habitude pour un jour futur' });
  }

  if (errors.length) throw AppError.badRequest('Paramètres invalides', errors);
  return date;
}

/** Période facultative ?from=&to= pour lister les réalisations. */
function validateCompletionRange(query) {
  const errors = [];
  for (const key of ['from', 'to']) {
    if (query[key] !== undefined && !isValidDateString(query[key])) {
      errors.push({ field: key, message: `${key} doit être une date au format YYYY-MM-DD` });
    }
  }
  if (!errors.length && query.from && query.to && query.from > query.to) {
    errors.push({ field: 'from', message: 'from doit précéder to' });
  }
  if (errors.length) throw AppError.badRequest('Paramètres invalides', errors);
  return { from: query.from, to: query.to };
}

/** ?tz= des routes qui calculent les séries : renvoie « aujourd'hui » dans ce fuseau. */
function validateTodayQuery(query) {
  const errors = [];
  const timezone = query.tz ?? 'UTC';
  checkTimezone(timezone, errors);
  if (errors.length) throw AppError.badRequest('Paramètres invalides', errors);
  return { today: todayIn(timezone) };
}

module.exports = {
  validateHabit, validateCompletionDate, validateCompletionRange, validateTodayQuery,
};
