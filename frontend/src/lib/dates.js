// Dates : toujours AAAA-MM-JJ, dans le fuseau du navigateur.
export const todayLocal = () => new Date().toLocaleDateString('sv-SE');
export const parseDay = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
export const isoDay = (date) => date.toLocaleDateString('sv-SE');
export const addDays = (iso, n) => { const d = parseDay(iso); d.setDate(d.getDate() + n); return isoDay(d); };
export const plural = (n, one, many) => `${n} ${n > 1 ? many : one}`;

export function formatDate(iso, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!iso) return 'Pas d’échéance';
  return parseDay(iso).toLocaleDateString('fr-FR', opts);
}

/** Une étape est en retard si son échéance est passée et qu'elle n'est pas validée. */
export function isOverdue(task) {
  return !!task.dueDate && task.status !== 'done' && task.dueDate < todayLocal();
}
