const mongoose = require('mongoose');
const Task = require('../models/Task');
const AppError = require('../utils/AppError');
const { today } = require('../utils/date');

/*
 * Toutes les requêtes filtrent sur { owner: ownerId }. Une tâche d'un autre
 * compte est donc introuvable pour l'appelant : on répond 404, sans même
 * révéler qu'elle existe.
 */

function ownedTaskQuery(ownerId, taskId) {
  if (!mongoose.isValidObjectId(taskId)) throw AppError.notFound('Tâche introuvable');
  return { _id: taskId, owner: ownerId };
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function list(ownerId, filters = {}) {
  const query = { owner: ownerId };

  if (filters.status) query.status = { $in: filters.status };
  if (filters.priority) query.priority = { $in: filters.priority };
  if (filters.dueBefore || filters.dueAfter) {
    query.dueDate = {};
    if (filters.dueAfter) query.dueDate.$gte = filters.dueAfter;
    if (filters.dueBefore) query.dueDate.$lte = filters.dueBefore;
  }
  if (filters.overdue === true) {
    query.dueDate = { ...query.dueDate, $lt: today() };
    query.status = { $in: (filters.status || ['todo', 'doing']).filter((s) => s !== 'done') };
  }
  if (filters.q) query.title = { $regex: escapeRegex(filters.q), $options: 'i' };

  const sort = filters.sort || '-createdAt';
  const direction = sort.startsWith('-') ? -1 : 1;
  const field = sort.replace(/^-/, '');

  return Task.find(query).sort({ [field]: direction, _id: direction });
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
