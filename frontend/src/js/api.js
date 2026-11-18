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

  return {
    getToken, getUser, setSession, clearSession,
    register: (body) => request('POST', '/auth/register', body),
    login: (body) => request('POST', '/auth/login', body),
    listTasks: async () => unwrapList(await request('GET', '/tasks')),
    getTask: async (id) => unwrapOne(await request('GET', `/tasks/${encodeURIComponent(id)}`)),
    createTask: async (body) => unwrapOne(await request('POST', '/tasks', body)),
    updateTask: async (id, body) => unwrapOne(await request('PUT', `/tasks/${encodeURIComponent(id)}`, body)),
    deleteTask: (id) => request('DELETE', `/tasks/${encodeURIComponent(id)}`),
  };
})();
