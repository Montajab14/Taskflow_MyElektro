import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { json, renderApp } from '../test/helpers';

const summary = { total: 2, byStatus: { todo: 1, doing: 0, done: 1 }, completionRate: 0.5, overdue: 0, byPriority: { high: 0 } };
const tasks = [
  { id: 'a', title: 'Souder le régulateur', status: 'doing', priority: 'high', dueDate: null },
  { id: 'b', title: 'Tester le LM7805', status: 'done', priority: 'medium', dueDate: '2030-01-01' },
];

let fetchMock;
beforeEach(() => {
  localStorage.setItem('myelektro_token', 't');
  localStorage.setItem('myelektro_user', JSON.stringify({ email: 'a@b.fr', name: 'Ada' }));
  fetchMock = vi.fn((url) => {
    if (url.includes('/stats/summary')) return json(summary);
    if (url.includes('/tasks')) return json(tasks);
    return json([]);
  });
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('liste des étapes', () => {
  it("affiche l'avancement, les étapes et le nom de l'utilisateur", async () => {
    renderApp('/tasks');
    expect(await screen.findByText('Souder le régulateur')).toBeInTheDocument();
    expect(screen.getByText('50 %')).toBeInTheDocument();
    expect(screen.getByText('Priorité haute')).toBeInTheDocument();
    expect(screen.getByText('Ada')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Étapes' })).toHaveAttribute('aria-current', 'page');
  });

  it('un filtre de statut relance la requête avec le bon paramètre', async () => {
    const user = userEvent.setup();
    renderApp('/tasks');
    await screen.findByText('Souder le régulateur');
    await user.click(screen.getByRole('button', { name: /Validé/ }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([u]) => u.includes('/tasks') && u.includes('status=done'))).toBe(true));
  });

  it('affiche une erreur avec un bouton Réessayer si l’API tombe', async () => {
    fetchMock.mockImplementation((url) => (url.includes('/stats/summary') ? json({ error: 'Panne' }, 500) : json([])));
    renderApp('/tasks');
    expect(await screen.findByRole('alert')).toHaveTextContent('Panne');
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument();
  });

  it('redirige vers la connexion sans session', async () => {
    localStorage.clear();
    renderApp('/tasks');
    expect(await screen.findByRole('tab', { name: 'Connexion' })).toBeInTheDocument();
  });
});

describe('formulaire', () => {
  it('refuse un titre vide sans appeler l’API, puis crée l’étape', async () => {
    const user = userEvent.setup();
    renderApp('/tasks/new');
    await user.click(await screen.findByRole('button', { name: 'Ajouter' }));
    expect(screen.getByText('Le titre doit contenir entre 1 et 120 caractères.')).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, o]) => o?.method === 'POST')).toBe(false);

    fetchMock.mockImplementation((url, o) => (o?.method === 'POST' ? json({ id: 'z', title: 'Nouvelle', status: 'todo', priority: 'medium' }, 201) : json({ id: 'z', title: 'Nouvelle', status: 'todo', priority: 'medium' })));
    await user.type(screen.getByLabelText(/Titre/), 'Nouvelle');
    await user.click(screen.getByRole('button', { name: 'Ajouter' }));
    expect(await screen.findByRole('heading', { name: 'Nouvelle' })).toBeInTheDocument();
  });

  it('compte les caractères de la description', async () => {
    const user = userEvent.setup();
    renderApp('/tasks/new');
    await user.type(await screen.findByLabelText(/Description/), 'abc');
    expect(screen.getByText('3 / 1000')).toBeInTheDocument();
  });
});

describe('détail', () => {
  it('demande confirmation avant de supprimer', async () => {
    fetchMock.mockImplementation((url, o) => {
      if (o?.method === 'DELETE') return json(undefined, 204);
      if (url.includes('/tasks/a')) return json(tasks[0]);
      if (url.includes('/stats/summary')) return json(summary);
      return json(tasks);
    });
    const user = userEvent.setup();
    renderApp('/tasks/a');
    await user.click(await screen.findByRole('button', { name: /Supprimer/ }));
    const dialog = document.querySelector('dialog');
    expect(dialog).toHaveAttribute('open');
    await user.click(within(dialog).getByRole('button', { name: 'Supprimer' }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([, o]) => o?.method === 'DELETE')).toBe(true));
    expect(await screen.findByText('Étape supprimée')).toBeInTheDocument();
  });
});
