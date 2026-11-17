const AppError = require('../utils/AppError');
const { isValidDateString, isValidTimezone } = require('../utils/date');

function checkTimezone(tz, errors) {
  if (!isValidTimezone(tz)) {
    errors.push({ field: 'tz', message: 'Fuseau horaire inconnu (ex. : Europe/Paris)' });
  }
}

function validateHeatmapQuery(query) {
  const errors = [];
  const timezone = query.tz ?? 'UTC';
  checkTimezone(timezone, errors);

  for (const key of ['from', 'to']) {
    if (query[key] !== undefined && !isValidDateString(query[key])) {
      errors.push({ field: key, message: `${key} doit être une date au format YYYY-MM-DD` });
    }
  }
  if (!errors.length && query.from && query.to) {
    if (query.from > query.to) {
      errors.push({ field: 'from', message: 'from doit précéder to' });
    } else if ((new Date(query.to) - new Date(query.from)) / 86400000 > 731) {
      errors.push({ field: 'from', message: 'La période ne doit pas dépasser 2 ans' });
    }
  }

  if (errors.length) throw AppError.badRequest('Paramètres invalides', errors);
  return { from: query.from, to: query.to, timezone };
}

function validateWeeklyQuery(query) {
  const errors = [];
  const timezone = query.tz ?? 'UTC';
  checkTimezone(timezone, errors);

  const weeks = query.weeks === undefined ? 12 : Number(query.weeks);
  if (!Number.isInteger(weeks) || weeks < 1 || weeks > 104) {
    errors.push({ field: 'weeks', message: 'weeks doit être un entier entre 1 et 104' });
  }

  if (errors.length) throw AppError.badRequest('Paramètres invalides', errors);
  return { weeks, timezone };
}

module.exports = { validateHeatmapQuery, validateWeeklyQuery };
