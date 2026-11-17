const mongoose = require('mongoose');
const Task = require('../models/Task');
const { today } = require('../utils/date');

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

module.exports = { summary };
