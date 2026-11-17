const AppError = require('../utils/AppError');
const { isValidDateString } = require('../utils/date');

function checkTimezone(tz, errors) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
  } catch {
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

module.exports = { validateHeatmapQuery };
