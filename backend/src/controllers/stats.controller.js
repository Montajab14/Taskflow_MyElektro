const statsService = require('../services/stats.service');

async function summary(req, res) {
  res.status(200).json(await statsService.summary(req.user.id));
}

module.exports = { summary };
