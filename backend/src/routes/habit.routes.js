const { Router } = require('express');
const controller = require('../controllers/habit.controller');
const requireAuth = require('../middlewares/auth');

const router = Router();

router.use(requireAuth);

router.get('/', controller.list);
router.post('/', controller.create);
router.get('/:id', controller.getOne);
router.put('/:id', controller.replace);
router.patch('/:id', controller.patch);
router.delete('/:id', controller.remove);

module.exports = router;
