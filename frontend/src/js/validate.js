// Validation côté client : mêmes règles que l'API (le serveur reste l'autorité).
(function (root) {
  const STATUSES = ['todo', 'doing', 'done'];
  const PRIORITIES = ['low', 'medium', 'high'];

  function isRealDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [y, m, d] = value.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
  }

  /** Renvoie { errors: [{field, message}], value } ; value est nettoyé si errors est vide. */
  function validateTask(input) {
    const errors = [];
    const title = typeof input.title === 'string' ? input.title.trim() : '';
    const description = input.description == null ? '' : input.description;
    const dueDate = input.dueDate === '' || input.dueDate === undefined ? null : input.dueDate;

    if (title.length < 1 || title.length > 120) {
      errors.push({ field: 'title', message: 'Le titre doit contenir entre 1 et 120 caractères.' });
    }
    if (!STATUSES.includes(input.status)) {
      errors.push({ field: 'status', message: 'Le statut doit être todo, doing ou done.' });
    }
    const priority = input.priority || 'medium';
    if (!PRIORITIES.includes(priority)) {
      errors.push({ field: 'priority', message: 'La priorité doit être low, medium ou high.' });
    }
    if (typeof description !== 'string' || description.length > 1000) {
      errors.push({ field: 'description', message: 'La description ne doit pas dépasser 1000 caractères.' });
    }
    if (dueDate !== null && !isRealDate(dueDate)) {
      errors.push({ field: 'dueDate', message: "L'échéance doit être une vraie date (AAAA-MM-JJ)." });
    }
    return { errors, value: { title, status: input.status, priority, description, dueDate } };
  }

  // Règles du mot de passe à l'inscription (la checklist de l'interface les affiche une par une).
  // « Caractère spécial » : ni lettre (accentuée ou non), ni chiffre, ni espace.
  const PASSWORD_RULES = [
    { id: 'length', label: '8 caractères minimum', test: (p) => p.length >= 8 },
    { id: 'upper', label: 'Une majuscule', test: (p) => /\p{Lu}/u.test(p) },
    { id: 'digit', label: 'Un chiffre', test: (p) => /\d/.test(p) },
    { id: 'special', label: 'Un caractère spécial (! ? # @ …)', test: (p) => /[^\p{L}\p{N}\s]/u.test(p) },
  ];
  const PASSWORD_WEAK_MESSAGE = 'Très bof le mot de passe.';

  /** [{ id, label, ok }] : l'état de chaque règle pour ce mot de passe. */
  function passwordChecks(password) {
    const value = typeof password === 'string' ? password : '';
    return PASSWORD_RULES.map(({ id, label, test }) => ({ id, label, ok: test(value) }));
  }

  function validateCredentials({ email, password, name }, { isRegister }) {
    const errors = [];
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.push({ field: 'email', message: 'Adresse e-mail invalide.' });
    }
    if (!password) {
      errors.push({ field: 'password', message: 'Le mot de passe est obligatoire.' });
    } else if (isRegister && !passwordChecks(password).every((c) => c.ok)) {
      // Seulement à l'inscription : à la connexion, les comptes existants restent acceptés.
      errors.push({ field: 'password', message: PASSWORD_WEAK_MESSAGE });
    }
    if (isRegister && name && (name.trim().length < 2 || name.trim().length > 60)) {
      errors.push({ field: 'name', message: 'Le nom doit contenir entre 2 et 60 caractères.' });
    }
    return errors;
  }

  const api = { STATUSES, PRIORITIES, isRealDate, validateTask, validateCredentials, passwordChecks };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Validate = api;
})(typeof window !== 'undefined' ? window : globalThis);
