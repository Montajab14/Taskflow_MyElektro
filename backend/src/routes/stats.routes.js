const { Router } = require('express');
const controller = require('../controllers/stats.controller');
const requireAuth = require('../middlewares/auth');

const router = Router();

router.use(requireAuth);

router.get('/summary', controller.summary);
router.get('/heatmap', controller.heatmap);

module.exports = router;
