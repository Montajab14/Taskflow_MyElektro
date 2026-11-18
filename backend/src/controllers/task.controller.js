const taskService = require('../services/task.service');
const { validateTask, validateListQuery } = require('../validators/task.validator');

// req.user.id vient du JWT vérifié par le middleware, jamais du corps de la requête.

async function list(req, res) {
  const tasks = await taskService.list(req.user.id, validateListQuery(req.query));
  res.status(200).json(tasks);
}

async function create(req, res) {
  const task = await taskService.create(req.user.id, validateTask(req.body));
  res.status(201).location(`/api/tasks/${task.id}`).json(task);
}

async function getOne(req, res) {
  const task = await taskService.getById(req.user.id, req.params.id);
  res.status(200).json(task);
}

async function replace(req, res) {
  const data = validateTask(req.body);
  const task = await taskService.update(req.user.id, req.params.id, data, { replace: true });
  res.status(200).json(task);
}

async function patch(req, res) {
  const data = validateTask(req.body, { partial: true });
  const task = await taskService.update(req.user.id, req.params.id, data, { replace: false });
  res.status(200).json(task);
}

async function remove(req, res) {
  await taskService.remove(req.user.id, req.params.id);
  res.status(204).end();
}

module.exports = { list, create, getOne, replace, patch, remove };
