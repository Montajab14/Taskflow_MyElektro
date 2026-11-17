const mongoose = require('mongoose');
const Habit = require('../models/Habit');
const HabitCompletion = require('../models/HabitCompletion');
const AppError = require('../utils/AppError');

/*
 * Même règle que pour les tâches : toutes les requêtes filtrent sur le
 * propriétaire. L'habitude d'un autre compte répond 404, comme si elle
 * n'existait pas.
 */

function ownedHabitQuery(ownerId, habitId) {
  if (!mongoose.isValidObjectId(habitId)) throw AppError.notFound('Habitude introuvable');
  return { _id: habitId, owner: ownerId };
}

async function list(ownerId) {
  return Habit.find({ owner: ownerId }).sort({ createdAt: 1, _id: 1 });
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
  list, create, getById, update, remove, listCompletions, addCompletion, removeCompletion,
};
