import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError, session, UNAUTHORIZED_EVENT } from './client';

const reply = (status, body) => Promise.resolve({
  ok: status >= 200 && status < 300, status,
  json: () => (body === undefined ? Promise.reject(new Error('vide')) : Promise.resolve(body)),
});

let fetchMock;
beforeEach(() => { fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock); });
afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });

describe('client API', () => {
  it('envoie le jeton en Bearer', async () => {
    session.set({ token: 'abc', user: { email: 'a@b.fr' } });
    fetchMock.mockReturnValue(reply(200, []));
    await api.listTasks();
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer abc');
  });

  it('accepte une liste sous forme de tableau, {items} ou {tasks}', async () => {
    for (const body of [[{ id: 1 }], { items: [{ id: 1 }] }, { tasks: [{ id: 1 }] }]) {
      fetchMock.mockReturnValueOnce(reply(200, body));
      expect(await api.listTasks()).toEqual([{ id: 1 }]);
    }
  });

  it('transmet le fuseau horaire et ignore les filtres vides', async () => {
    fetchMock.mockReturnValue(reply(200, []));
    await api.listTasks({ status: '', q: 'led', overdue: '' });
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.searchParams.get('q')).toBe('led');
    expect(url.searchParams.has('status')).toBe(false);
    expect(url.searchParams.has('tz')).toBe(true);
  });

  it('lit une suppression 204 sans corps', async () => {
    fetchMock.mockReturnValue(reply(204));
    await expect(api.deleteTask('1')).resolves.toBeNull();
  });

  it("normalise l'erreur, qu'elle soit une chaîne ou {code,message}", async () => {
    fetchMock.mockReturnValueOnce(reply(400, { error: 'Titre requis', details: [{ field: 'title', message: 'vide' }] }));
    await expect(api.createTask({})).rejects.toMatchObject({ message: 'Titre requis', status: 400, details: [{ field: 'title', message: 'vide' }] });
    fetchMock.mockReturnValueOnce(reply(409, { error: { code: 'EMAIL_ALREADY_USED', message: 'Déjà pris' } }));
    const err = await api.register({}).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ code: 'EMAIL_ALREADY_USED', message: 'Déjà pris' });
  });

  it('efface la session et prévient sur un 401 hors connexion', async () => {
    session.set({ token: 'abc', user: {} });
    const onUnauthorized = vi.fn();
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    fetchMock.mockReturnValue(reply(401, { error: 'Jeton invalide' }));
    await expect(api.listTasks()).rejects.toThrow();
    window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    expect(session.getToken()).toBeNull();
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  it('garde la session sur un 401 de la page de connexion', async () => {
    session.set({ token: 'abc', user: {} });
    fetchMock.mockReturnValue(reply(401, { error: 'Identifiants incorrects' }));
    await expect(api.login({})).rejects.toThrow('Identifiants incorrects');
    expect(session.getToken()).toBe('abc');
  });

  it('envoie le fuseau en cochant une habitude', async () => {
    fetchMock.mockReturnValue(reply(200, {}));
    await api.checkHabit('h1', '2026-11-19');
    expect(fetchMock.mock.calls[0][0]).toContain('tz=');
  });

  it("signale une API injoignable", async () => {
    fetchMock.mockRejectedValue(new TypeError('failed'));
    await expect(api.listTasks()).rejects.toThrow(/joindre l'API/);
  });
});
