const { Router } = require('express');
const controller = require('../controllers/auth.controller');
const requireAuth = require('../middlewares/auth');

const router = Router();

router.post('/register', controller.register);
router.post('/login', controller.login);
router.get('/me', requireAuth, controller.me);

module.exports = router;
