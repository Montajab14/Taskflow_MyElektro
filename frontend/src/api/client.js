// Client HTTP unique : en-tête Bearer, erreurs normalisées, déconnexion sur 401.
// Tolérant sur les formats de l'API : liste en tableau, { items } ou { tasks } ;
// erreur en { error: "message" } ou { error: { code, message } }.
import { API_URL } from '../config';

const TOKEN_KEY = 'myelektro_token';
const USER_KEY = 'myelektro_user';
export const UNAUTHORIZED_EVENT = 'myelektro:unauthorized';

export const session = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  getUser() {
    try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
  },
  set({ token, user }) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

/** Erreur normalisée : status HTTP, code éventuel, message lisible, details:[{field,message}]. */
export class ApiError extends Error {
  constructor(message, { status = 0, code, details = [] } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = Array.isArray(details) ? details : [];
  }
}

function errorFrom(res, json) {
  const e = json && json.error;
  const message = (typeof e === 'string' ? e : e && e.message) || 'Erreur serveur';
  const code = e && typeof e === 'object' ? e.code : undefined;
  const details = (e && typeof e === 'object' && e.details) || json?.details || [];
  return new ApiError(message, { status: res.status, code, details });
}

async function request(method, path, body, { signal } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = session.getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(API_URL + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError("Impossible de joindre l'API. Le serveur est-il lancé ?");
  }

  if (res.status === 204) return null;
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const apiErr = errorFrom(res, json);
    // Session expirée ou jeton refusé (hors tentative de connexion elle-même)
    if (res.status === 401 && !path.startsWith('/auth/')) {
      session.clear();
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    throw apiErr;
  }
  return json;
}

const toList = (d) => (Array.isArray(d) ? d : d?.items ?? d?.tasks ?? []);
const toOne = (d) => d?.task ?? d;

/** Fuseau du navigateur (ex. Europe/Paris) : « aujourd'hui » et « en retard » sont jugés comme l'utilisateur les voit. */
export const tz = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

/** Ajoute une chaîne de requête en ignorant les paramètres vides. */
export function withQuery(path, params = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '' && v !== false) qs.set(k, String(v));
  }
  const str = qs.toString();
  return str ? `${path}?${str}` : path;
}

const id = encodeURIComponent;

export const api = {
  register: (body) => request('POST', '/auth/register', body),
  login: (body) => request('POST', '/auth/login', body),

  // Étapes (tâches)
  listTasks: async (params = {}, opts) => toList(await request('GET', withQuery('/tasks', { ...params, tz: tz() }), undefined, opts)),
  getTask: async (taskId) => toOne(await request('GET', `/tasks/${id(taskId)}`)),
  createTask: async (body) => toOne(await request('POST', '/tasks', body)),
  updateTask: async (taskId, body) => toOne(await request('PUT', `/tasks/${id(taskId)}`, body)),
  deleteTask: (taskId) => request('DELETE', `/tasks/${id(taskId)}`),

  // Bonus B1, B3, B4 : statistiques calculées par MongoDB
  summary: () => request('GET', withQuery('/stats/summary', { tz: tz() })),
  heatmap: () => request('GET', withQuery('/stats/heatmap', { tz: tz() })),
  weekly: (weeks = 12) => request('GET', withQuery('/stats/weekly', { weeks, tz: tz() })),

  // Bonus B2 : habitudes
  listHabits: async () => toList(await request('GET', withQuery('/habits', { tz: tz() }))),
  createHabit: (body) => request('POST', '/habits', body),
  deleteHabit: (habitId) => request('DELETE', `/habits/${id(habitId)}`),
  listCompletions: async (habitId, from, to) => toList(await request('GET', withQuery(`/habits/${id(habitId)}/completions`, { from, to }))),
  checkHabit: (habitId, date) => request('PUT', withQuery(`/habits/${id(habitId)}/completions/${date}`, { tz: tz() })),
  uncheckHabit: (habitId, date) => request('DELETE', withQuery(`/habits/${id(habitId)}/completions/${date}`, { tz: tz() })),
};
