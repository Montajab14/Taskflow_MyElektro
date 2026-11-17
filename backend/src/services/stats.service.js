const mongoose = require('mongoose');
const Task = require('../models/Task');
const {
  today, todayIn, parseDay, addDays, mondayOf,
} = require('../utils/date');

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

/**
 * B4 : statistiques par semaine (du lundi au dimanche) sur les N dernières semaines.
 * - created : tâches créées dans la semaine
 * - completed : tâches terminées dans la semaine (quelle que soit leur date de création)
 * - completionRate : part des tâches créées dans la semaine qui sont terminées aujourd'hui
 */
async function weekly(ownerId, { weeks, timezone }) {
  const currentMonday = mondayOf(todayIn(timezone));
  const firstMonday = addDays(currentMonday, -7 * (weeks - 1));
  const lowerBound = parseDay(addDays(firstMonday, -1));

  const weekOf = (field) => ({
    $dateToString: {
      date: { $dateTrunc: { date: field, unit: 'week', startOfWeek: 'monday', timezone } },
      format: '%Y-%m-%d',
      timezone,
    },
  });

  const [result] = await Task.aggregate([
    { $match: ownerMatch(ownerId) },
    {
      $facet: {
        created: [
          { $match: { createdAt: { $gte: lowerBound } } },
          {
            $group: {
              _id: weekOf('$createdAt'),
              created: { $sum: 1 },
              createdAndDone: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } },
            },
          },
        ],
        completed: [
          { $match: { completedAt: { $gte: lowerBound } } },
          { $group: { _id: weekOf('$completedAt'), completed: { $sum: 1 } } },
        ],
      },
    },
  ]);

  const created = new Map(result.created.map((r) => [r._id, r]));
  const completed = new Map(result.completed.map((r) => [r._id, r.completed]));

  const series = [];
  for (let i = 0; i < weeks; i += 1) {
    const weekStart = addDays(firstMonday, 7 * i);
    const c = created.get(weekStart);
    series.push({
      weekStart,
      weekEnd: addDays(weekStart, 6),
      created: c?.created ?? 0,
      completed: completed.get(weekStart) ?? 0,
      completionRate: c ? Math.round((c.createdAndDone / c.created) * 1000) / 1000 : null,
    });
  }

  return { timezone, weeks: series };
}

module.exports = { summary, heatmap, weekly };
