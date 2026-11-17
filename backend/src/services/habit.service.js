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

module.exports = { list, create, getById, update, remove };
