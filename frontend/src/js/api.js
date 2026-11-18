// Client HTTP unique : en-tête Bearer, erreurs normalisées, déconnexion sur 401.
window.Api = (function () {
  const cfg = window.MYELEKTRO_CONFIG;
  const TOKEN_KEY = 'myelektro_token';
  const USER_KEY = 'myelektro_user';

  const getToken = () => localStorage.getItem(TOKEN_KEY);
  const getUser = () => {
    try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
  };
  function setSession({ token, user }) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  /** Erreur normalisée : { status, message, details:[{field,message}] } */
  function toApiError(err) {
    const e = new Error(err.message || 'Erreur inconnue');
    e.status = err.status || 0;
    e.details = err.details || [];
    return e;
  }

  async function request(method, path, body) {
    try {
      let data;
      if (cfg.useMock) {
        data = await window.MockApi.handle(method, path, body, getToken());
      } else {
        const headers = { 'Content-Type': 'application/json' };
        if (getToken()) headers.Authorization = `Bearer ${getToken()}`;
        let res;
        try {
          res = await fetch(cfg.apiUrl + path, {
            method,
            headers,
            body: body === undefined ? undefined : JSON.stringify(body),
          });
        } catch {
          throw { status: 0, message: "Impossible de joindre l'API. Le serveur est-il lancé ?" };
        }
        if (res.status === 204) return null;
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw { status: res.status, message: json.error || 'Erreur serveur', details: json.details };
        data = json;
      }
      return data;
    } catch (err) {
      const apiErr = toApiError(err);
      // Session expirée ou jeton refusé (hors tentative de connexion elle-même)
      if (apiErr.status === 401 && !path.startsWith('/auth/login') && !path.startsWith('/auth/register')) {
        clearSession();
        window.dispatchEvent(new Event('myelektro:unauthorized'));
      }
      throw apiErr;
    }
  }

  // Tolère { tasks: [...] } / { task: {...} } en plus des formes directes.
  const unwrapList = (d) => (Array.isArray(d) ? d : d && d.tasks) || [];
  const unwrapOne = (d) => (d && d.task) || d;

  /** Fuseau du navigateur (ex. Europe/Paris) : « aujourd'hui » et « en retard » sont jugés comme l'utilisateur les voit. */
  const tz = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  /** Ajoute une chaîne de requête en ignorant les paramètres vides. */
  function withQuery(path, params = {}) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '' && v !== false) qs.set(k, String(v));
    }
    const str = qs.toString();
    return str ? `${path}?${str}` : path;
  }
  const id = (x) => encodeURIComponent(x);

  return {
    getToken, getUser, setSession, clearSession, tz,
    register: (body) => request('POST', '/auth/register', body),
    login: (body) => request('POST', '/auth/login', body),
    listTasks: async (params = {}) => unwrapList(await request('GET', withQuery('/tasks', { ...params, tz: tz() }))),
    // Bonus B1, B3, B4 : statistiques calculées par MongoDB
    summary: () => request('GET', withQuery('/stats/summary', { tz: tz() })),
    heatmap: () => request('GET', withQuery('/stats/heatmap', { tz: tz() })),
    weekly: (weeks = 12) => request('GET', withQuery('/stats/weekly', { weeks, tz: tz() })),
    // Bonus B2 : habitudes
    listHabits: () => request('GET', withQuery('/habits', { tz: tz() })),
    createHabit: (body) => request('POST', '/habits', body),
    deleteHabit: (habitId) => request('DELETE', `/habits/${id(habitId)}`),
    listCompletions: (habitId, from, to) => request('GET', withQuery(`/habits/${id(habitId)}/completions`, { from, to })),
    checkHabit: (habitId, date) => request('PUT', `/habits/${id(habitId)}/completions/${date}`),
    uncheckHabit: (habitId, date) => request('DELETE', `/habits/${id(habitId)}/completions/${date}`),
    getTask: async (id) => unwrapOne(await request('GET', `/tasks/${encodeURIComponent(id)}`)),
    createTask: async (body) => unwrapOne(await request('POST', '/tasks', body)),
    updateTask: async (id, body) => unwrapOne(await request('PUT', `/tasks/${encodeURIComponent(id)}`, body)),
    deleteTask: (id) => request('DELETE', `/tasks/${encodeURIComponent(id)}`),
  };
})();
