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

module.exports = { isValidDateString };
