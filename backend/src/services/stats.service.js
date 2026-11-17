const mongoose = require('mongoose');
const Task = require('../models/Task');
const { today } = require('../utils/date');

const DAY_MS = 24 * 60 * 60 * 1000;

/** "YYYY-MM-DD" -> Date à minuit UTC */
const parseDay = (s) => new Date(`${s}T00:00:00Z`);
const formatDay = (d) => d.toISOString().slice(0, 10);
const addDays = (s, n) => formatDay(new Date(parseDay(s).getTime() + n * DAY_MS));

/** Date du jour dans le fuseau demandé, au format YYYY-MM-DD. */
function todayIn(timezone) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date());
}

const ownerMatch = (ownerId) => ({ owner: new mongoose.Types.ObjectId(ownerId) });

/** B1 : compteurs par statut et priorité, tâches en retard, taux de complétion global. */
async function summary(ownerId) {
  const [result] = await Task.aggregate([
    { $match: ownerMatch(ownerId) },
    {
      $facet: {
        byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
        byPriority: [{ $group: { _id: '$priority', count: { $sum: 1 } } }],
        overdue: [
          { $match: { status: { $ne: 'done' }, dueDate: { $ne: null, $lt: today() } } },
          { $count: 'count' },
        ],
      },
    },
  ]);

  const byStatus = { todo: 0, doing: 0, done: 0 };
  result.byStatus.forEach(({ _id, count }) => { byStatus[_id] = count; });
  const byPriority = { low: 0, medium: 0, high: 0 };
  result.byPriority.forEach(({ _id, count }) => { byPriority[_id] = count; });
  const total = byStatus.todo + byStatus.doing + byStatus.done;

  return {
    total,
    byStatus,
    byPriority,
    overdue: result.overdue[0]?.count ?? 0,
    completionRate: total ? Math.round((byStatus.done / total) * 1000) / 1000 : 0,
  };
}

/**
 * B3 : nombre de tâches terminées par jour, du jour "from" au jour "to" inclus.
 * Tous les jours de la période sont renvoyés, y compris ceux à 0.
 */
async function heatmap(ownerId, { from, to, timezone }) {
  const end = to || todayIn(timezone);
  const start = from || addDays(end, -364);

  const rows = await Task.aggregate([
    {
      $match: {
        ...ownerMatch(ownerId),
        // Bornes larges d'un jour de chaque côté : le découpage exact se fait
        // ensuite sur la date locale, dans le fuseau demandé.
        completedAt: { $gte: parseDay(addDays(start, -1)), $lt: parseDay(addDays(end, 2)) },
      },
    },
    {
      $group: {
        _id: { $dateToString: { date: '$completedAt', format: '%Y-%m-%d', timezone } },
        count: { $sum: 1 },
      },
    },
    { $match: { _id: { $gte: start, $lte: end } } },
  ]);

  const counts = new Map(rows.map((r) => [r._id, r.count]));
  const days = [];
  for (let d = start; d <= end; d = addDays(d, 1)) {
    days.push({ date: d, count: counts.get(d) || 0 });
  }

  return {
    from: start,
    to: end,
    timezone,
    total: rows.reduce((sum, r) => sum + r.count, 0),
    max: Math.max(0, ...days.map((d) => d.count)),
    days,
  };
}

module.exports = { summary, heatmap, todayIn };
