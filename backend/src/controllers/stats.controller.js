const statsService = require('../services/stats.service');
const {
  validateHeatmapQuery, validateWeeklyQuery, validateSummaryQuery,
} = require('../validators/stats.validator');

async function summary(req, res) {
  res.status(200).json(await statsService.summary(req.user.id, validateSummaryQuery(req.query)));
}

async function heatmap(req, res) {
  res.status(200).json(await statsService.heatmap(req.user.id, validateHeatmapQuery(req.query)));
}

async function weekly(req, res) {
  res.status(200).json(await statsService.weekly(req.user.id, validateWeeklyQuery(req.query)));
}

module.exports = { summary, heatmap, weekly };
