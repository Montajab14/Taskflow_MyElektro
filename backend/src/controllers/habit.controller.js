const habitService = require('../services/habit.service');
const { validateHabit } = require('../validators/habit.validator');

async function list(req, res) {
  res.status(200).json(await habitService.list(req.user.id));
}

async function create(req, res) {
  const habit = await habitService.create(req.user.id, validateHabit(req.body));
  res.status(201).location(`/api/habits/${habit.id}`).json(habit);
}

async function getOne(req, res) {
  res.status(200).json(await habitService.getById(req.user.id, req.params.id));
}

async function replace(req, res) {
  const data = validateHabit(req.body);
  res.status(200).json(await habitService.update(req.user.id, req.params.id, data, { replace: true }));
}

async function patch(req, res) {
  const data = validateHabit(req.body, { partial: true });
  res.status(200).json(await habitService.update(req.user.id, req.params.id, data, { replace: false }));
}

async function remove(req, res) {
  await habitService.remove(req.user.id, req.params.id);
  res.status(204).end();
}

module.exports = { list, create, getOne, replace, patch, remove };
