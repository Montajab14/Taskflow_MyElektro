const authService = require('../services/auth.service');
const { validateRegister, validateLogin } = require('../validators/auth.validator');

async function register(req, res) {
  const { token, user } = await authService.register(validateRegister(req.body));
  res.status(201).json({ token, user });
}

async function login(req, res) {
  const { token, user } = await authService.login(validateLogin(req.body));
  res.status(200).json({ token, user });
}

module.exports = { register, login };
