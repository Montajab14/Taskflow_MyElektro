const AppError = require('../utils/AppError');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 72; // bcrypt ignore tout ce qui dépasse 72 octets
const NAME_MIN = 2;
const NAME_MAX = 60;

function checkEmail(email, errors) {
  if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    errors.push({ field: 'email', message: 'Adresse e-mail invalide' });
  }
}

function checkPassword(password, errors, { checkStrength }) {
  if (typeof password !== 'string' || password.length === 0) {
    errors.push({ field: 'password', message: 'Le mot de passe est obligatoire' });
  } else if (checkStrength && password.length < PASSWORD_MIN) {
    errors.push({ field: 'password', message: `Le mot de passe très bof. Il doit contenir au moins ${PASSWORD_MIN} caractères` });
  } else if (Buffer.byteLength(password) > PASSWORD_MAX) {
    errors.push({ field: 'password', message: `Le mot de passe ne doit pas dépasser ${PASSWORD_MAX} octets` });
  }
}

function validateRegister(body) {
  const errors = [];
  const { email, password, name } = body || {};

  checkEmail(email, errors);
  checkPassword(password, errors, { checkStrength: true });
  if (name !== undefined && name !== null) {
    if (typeof name !== 'string' || name.trim().length < NAME_MIN || name.trim().length > NAME_MAX) {
      errors.push({ field: 'name', message: `Le nom doit contenir entre ${NAME_MIN} et ${NAME_MAX} caractères` });
    }
  }

  if (errors.length) throw AppError.badRequest('Données invalides', errors);
  return {
    email: email.trim().toLowerCase(),
    password,
    name: typeof name === 'string' ? name.trim() : null,
  };
}

function validateLogin(body) {
  const errors = [];
  const { email, password } = body || {};

  checkEmail(email, errors);
  checkPassword(password, errors, { checkStrength: false });

  if (errors.length) throw AppError.badRequest('Données invalides', errors);
  return { email: email.trim().toLowerCase(), password };
}

module.exports = { validateRegister, validateLogin };
