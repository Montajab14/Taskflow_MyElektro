const statsService = require('../services/stats.service');
const { validateHeatmapQuery } = require('../validators/stats.validator');

async function summary(req, res) {
  res.status(200).json(await statsService.summary(req.user.id));
}

async function heatmap(req, res) {
  res.status(200).json(await statsService.heatmap(req.user.id, validateHeatmapQuery(req.query)));
}

module.exports = { summary, heatmap };
