// Faux backend en localStorage, qui imite le contrat de l'API TaskFlow.
// Uniquement pour développer le front sans serveur. Les mots de passe ne sont PAS
// sécurisés ici : ne jamais utiliser ce mode en production.
window.MockApi = (function () {
  const KEY = 'myelektro_mock';
  const load = () => JSON.parse(localStorage.getItem(KEY) || '{"users":[],"tasks":[],"seq":1}');
  const save = (db) => localStorage.setItem(KEY, JSON.stringify(db));

  function fail(status, message, details) {
    const err = new Error(message);
    err.status = status;
    err.details = details;
    return err;
  }

  function userFromToken(db, token) {
    const id = token && token.startsWith('mock.') ? token.slice(5) : null;
    const user = db.users.find((u) => u.id === id);
    if (!user) throw fail(401, 'Jeton invalide ou expiré');
    return user;
  }

  const publicUser = (u) => ({ id: u.id, email: u.email, name: u.name || null });

  async function handle(method, path, body, token) {
    const db = load();

    if (method === 'POST' && path === '/auth/register') {
      const errors = Validate.validateCredentials(body || {}, { isRegister: true });
      if (errors.length) throw fail(400, 'Données invalides', errors);
      const email = body.email.trim().toLowerCase();
      if (db.users.some((u) => u.email === email)) throw fail(409, 'Un compte existe déjà avec cet e-mail');
      const user = { id: 'u' + db.seq++, email, name: body.name ? body.name.trim() : null, password: body.password };
      db.users.push(user);
      save(db);
      return { token: 'mock.' + user.id, user: publicUser(user) };
    }

    if (method === 'POST' && path === '/auth/login') {
      const errors = Validate.validateCredentials(body || {}, { isRegister: false });
      if (errors.length) throw fail(400, 'Données invalides', errors);
      const user = db.users.find((u) => u.email === body.email.trim().toLowerCase());
      if (!user || user.password !== body.password) throw fail(401, 'E-mail ou mot de passe incorrect');
      return { token: 'mock.' + user.id, user: publicUser(user) };
    }

    const user = userFromToken(db, token);

    if (method === 'GET' && path === '/auth/me') return { user: publicUser(user) };

    const mine = db.tasks.filter((t) => t.userId === user.id);

    if (path === '/tasks' && method === 'GET') {
      return mine.map(({ userId, ...t }) => t).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }

    if (path === '/tasks' && method === 'POST') {
      const { errors, value } = Validate.validateTask(body || {});
      if (errors.length) throw fail(400, 'Données invalides', errors);
      const task = { id: 't' + db.seq++, userId: user.id, ...value, createdAt: new Date().toISOString() };
      db.tasks.push(task);
      save(db);
      const { userId, ...out } = task;
      return out;
    }

    const m = path.match(/^\/tasks\/([^/]+)$/);
    if (m) {
      const task = mine.find((t) => t.id === m[1]); // la tâche d'un autre utilisateur = 404
      if (!task) throw fail(404, 'Ressource introuvable');
      const strip = ({ userId, ...t }) => t;
      if (method === 'GET') return strip(task);
      if (method === 'PUT') {
        const { errors, value } = Validate.validateTask(body || {});
        if (errors.length) throw fail(400, 'Données invalides', errors);
        Object.assign(task, value);
        save(db);
        return strip(task);
      }
      if (method === 'DELETE') {
        db.tasks = db.tasks.filter((t) => t !== task);
        save(db);
        return null;
      }
    }

    throw fail(404, `Route introuvable : ${method} ${path}`);
  }

  return { handle };
})();
