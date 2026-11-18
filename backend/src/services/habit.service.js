const mongoose = require('mongoose');
const Habit = require('../models/Habit');
const HabitCompletion = require('../models/HabitCompletion');
const AppError = require('../utils/AppError');
const { addDays } = require('../utils/date');

/*
 * Même règle que pour les tâches : toutes les requêtes filtrent sur le
 * propriétaire. L'habitude d'un autre compte répond 404, comme si elle
 * n'existait pas.
 */

function ownedHabitQuery(ownerId, habitId) {
  if (!mongoose.isValidObjectId(habitId)) throw AppError.notFound('Habitude introuvable');
  return { _id: habitId, owner: ownerId };
}

/**
 * Statistiques d'une habitude à partir de ses jours cochés, triés et uniques.
 * La série en cours compte les jours consécutifs jusqu'à aujourd'hui, ou
 * jusqu'à hier : elle n'est pas rompue tant que la journée n'est pas finie.
 */
function computeStats(dates, today) {
  let longestStreak = 0;
  let run = 0;
  dates.forEach((d, i) => {
    run = i > 0 && addDays(dates[i - 1], 1) === d ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
  });

  const last = dates.at(-1) ?? null;
  let currentStreak = 0;
  if (last === today || last === addDays(today, -1)) {
    currentStreak = 1;
    for (let i = dates.length - 1; i > 0 && addDays(dates[i - 1], 1) === dates[i]; i -= 1) {
      currentStreak += 1;
    }
  }

  return {
    total: dates.length,
    currentStreak,
    longestStreak,
    lastCompletedOn: last,
    doneToday: last === today,
  };
}

/** Ajoute { stats } à chaque habitude, en une seule agrégation sur les réalisations. */
async function withStats(ownerId, habits, today) {
  const rows = await HabitCompletion.aggregate([
    { $match: { owner: new mongoose.Types.ObjectId(ownerId), habit: { $in: habits.map((h) => h._id) } } },
    { $sort: { date: 1 } },
    { $group: { _id: '$habit', dates: { $push: '$date' } } },
  ]);
  const datesByHabit = new Map(rows.map((r) => [r._id.toString(), r.dates]));
  return habits.map((h) => ({
    ...h.toJSON(),
    stats: computeStats(datesByHabit.get(h.id) || [], today),
  }));
}

async function list(ownerId, { today }) {
  const habits = await Habit.find({ owner: ownerId }).sort({ createdAt: 1, _id: 1 });
  return withStats(ownerId, habits, today);
}

async function getWithStats(ownerId, habitId, { today }) {
  const [habit] = await withStats(ownerId, [await getById(ownerId, habitId)], today);
  return habit;
}

async function create(ownerId, data) {
  return Habit.create({ ...data, owner: ownerId });
}

async function getById(ownerId, habitId) {
  const habit = await Habit.findOne(ownedHabitQuery(ownerId, habitId));
  if (!habit) throw AppError.notFound('Habitude introuvable');
  return habit;
}

/** replace = true (PUT) : description absente remise à "". replace = false (PATCH). */
async function update(ownerId, habitId, data, { replace }) {
  const habit = await getById(ownerId, habitId);
  habit.set(replace ? { description: '', ...data } : data);
  return habit.save();
}

/** Supprime l'habitude et toutes ses réalisations. */
async function remove(ownerId, habitId) {
  const result = await Habit.deleteOne(ownedHabitQuery(ownerId, habitId));
  if (result.deletedCount === 0) throw AppError.notFound('Habitude introuvable');
  await HabitCompletion.deleteMany({ owner: ownerId, habit: habitId });
}

/** Réalisations d'une habitude, de la plus ancienne à la plus récente. */
async function listCompletions(ownerId, habitId, { from, to }) {
  await getById(ownerId, habitId);
  const query = { owner: ownerId, habit: habitId };
  if (from || to) {
    query.date = {};
    if (from) query.date.$gte = from;
    if (to) query.date.$lte = to;
  }
  return HabitCompletion.find(query).sort({ date: 1 });
}

/**
 * Marque l'habitude comme faite ce jour-là. Idempotent : renvoie
 * { completion, created } où created = false si le jour était déjà coché.
 */
async function addCompletion(ownerId, habitId, date) {
  await getById(ownerId, habitId);
  const filter = { owner: ownerId, habit: habitId, date };
  try {
    const result = await HabitCompletion.findOneAndUpdate(
      filter,
      { $setOnInsert: filter },
      { upsert: true, new: true, includeResultMetadata: true },
    );
    return { completion: result.value, created: !result.lastErrorObject.updatedExisting };
  } catch (err) {
    // Deux requêtes simultanées pour le même jour : l'index unique tranche.
    if (err.code !== 11000) throw err;
    return { completion: await HabitCompletion.findOne(filter), created: false };
  }
}

async function removeCompletion(ownerId, habitId, date) {
  await getById(ownerId, habitId);
  const result = await HabitCompletion.deleteOne({ owner: ownerId, habit: habitId, date });
  if (result.deletedCount === 0) throw AppError.notFound('Aucune réalisation ce jour-là');
}

module.exports = {
  list,
  create,
  getById,
  getWithStats,
  update,
  remove,
  listCompletions,
  addCompletion,
  removeCompletion,
  computeStats,
};
