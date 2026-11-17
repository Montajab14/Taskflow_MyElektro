const mongoose = require('mongoose');
const Task = require('../models/Task');
const AppError = require('../utils/AppError');

/*
 * Toutes les requêtes filtrent sur { owner: ownerId }. Une tâche d'un autre
 * compte est donc introuvable pour l'appelant : on répond 404, sans même
 * révéler qu'elle existe.
 */

function ownedTaskQuery(ownerId, taskId) {
  if (!mongoose.isValidObjectId(taskId)) throw AppError.notFound('Tâche introuvable');
  return { _id: taskId, owner: ownerId };
}

async function list(ownerId) {
  return Task.find({ owner: ownerId }).sort({ createdAt: -1, _id: -1 });
}

async function create(ownerId, data) {
  return Task.create({ ...data, owner: ownerId });
}

async function getById(ownerId, taskId) {
  const task = await Task.findOne(ownedTaskQuery(ownerId, taskId));
  if (!task) throw AppError.notFound('Tâche introuvable');
  return task;
}

/**
 * replace = true (PUT) : les champs facultatifs absents reprennent leur valeur
 * par défaut. replace = false (PATCH) : seuls les champs fournis changent.
 */
async function update(ownerId, taskId, data, { replace }) {
  const task = await getById(ownerId, taskId);

  const next = replace
    ? { description: '', dueDate: null, priority: 'medium', ...data }
    : data;

  task.set(next);
  return task.save();
}

async function remove(ownerId, taskId) {
  const result = await Task.deleteOne(ownedTaskQuery(ownerId, taskId));
  if (result.deletedCount === 0) throw AppError.notFound('Tâche introuvable');
}

module.exports = { list, create, getById, update, remove };
