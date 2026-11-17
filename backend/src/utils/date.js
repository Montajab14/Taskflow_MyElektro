const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Vrai si s est au format YYYY-MM-DD ET correspond à une date réelle (refuse 2025-02-30). */
function isValidDateString(s) {
  if (typeof s !== 'string') return false;
  const m = DATE_RE.exec(s);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

/**
 * Date du jour au format YYYY-MM-DD, en UTC : même référence pour le filtre
 * « en retard » et pour les statistiques, quel que soit le fuseau du serveur.
 */
function today() {
  return new Date().toISOString().slice(0, 10);
}

/** Date du jour dans le fuseau IANA demandé (ex. Europe/Paris), au format YYYY-MM-DD. */
function todayIn(timezone) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date());
}

/** Vrai si timezone est un fuseau IANA connu. */
function isValidTimezone(timezone) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** "YYYY-MM-DD" -> Date à minuit UTC. */
const parseDay = (s) => new Date(`${s}T00:00:00Z`);

/** Date -> "YYYY-MM-DD" (UTC). */
const formatDay = (d) => d.toISOString().slice(0, 10);

/** Ajoute n jours (négatif pour reculer) à un jour "YYYY-MM-DD". */
const addDays = (s, n) => formatDay(new Date(parseDay(s).getTime() + n * DAY_MS));

/** Lundi de la semaine contenant le jour s. */
function mondayOf(s) {
  const dow = (parseDay(s).getUTCDay() + 6) % 7; // lundi = 0
  return addDays(s, -dow);
}

module.exports = {
  isValidDateString,
  isValidTimezone,
  today,
  todayIn,
  parseDay,
  formatDay,
  addDays,
  mondayOf,
};
