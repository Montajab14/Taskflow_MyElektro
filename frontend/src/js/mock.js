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

  async function handle(method, fullPath, body, token) {
    const db = load();
    const [path, qs = ''] = fullPath.split('?');
    const query = Object.fromEntries(new URLSearchParams(qs));

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

    const today = new Date().toLocaleDateString('sv-SE');
    const isLate = (t) => t.dueDate && t.status !== 'done' && t.dueDate < today;

    if (path === '/tasks' && method === 'GET') {
      let list = mine.map(({ userId, ...t }) => ({ priority: 'medium', ...t }));
      if (query.status) list = list.filter((t) => query.status.split(',').includes(t.status));
      if (query.priority) list = list.filter((t) => query.priority.split(',').includes(t.priority));
      if (query.overdue === 'true') list = list.filter(isLate);
      if (query.q) {
        const q = query.q.toLowerCase();
        list = list.filter((t) => `${t.title} ${t.description}`.toLowerCase().includes(q));
      }
      const sort = query.sort || '-createdAt';
      const key = sort.replace('-', '');
      const dir = sort.startsWith('-') ? -1 : 1;
      // Comme MongoDB : les échéances vides passent en premier en ordre croissant
      return list.sort((a, b) => dir * String(a[key] ?? '').localeCompare(String(b[key] ?? '')));
    }

    if (path === '/stats/summary' && method === 'GET') {
      const byStatus = { todo: 0, doing: 0, done: 0 };
      const byPriority = { low: 0, medium: 0, high: 0 };
      mine.forEach((t) => { byStatus[t.status] += 1; byPriority[t.priority || 'medium'] += 1; });
      const total = mine.length;
      return {
        total, byStatus, byPriority,
        overdue: mine.filter(isLate).length,
        completionRate: total ? Math.round((byStatus.done / total) * 1000) / 1000 : 0,
      };
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

    throw fail(404, `Le mode mock ne gère pas ${method} ${path} : passez useMock à false pour utiliser l'API`);
  }

  return { handle };
})();
