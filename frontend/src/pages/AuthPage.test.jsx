import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { json, renderApp } from '../test/helpers';

let fetchMock;
beforeEach(() => { fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock); });
afterEach(() => vi.unstubAllGlobals());

async function openRegister() {
  const user = userEvent.setup();
  renderApp('/login');
  await user.click(screen.getByRole('tab', { name: 'Inscription' }));
  return user;
}

describe('inscription : mot de passe', () => {
  it('affiche la checklist en ✗ puis passe chaque condition en ✓', async () => {
    const user = await openRegister();
    const rules = screen.getByRole('list', { name: 'Conditions du mot de passe' });
    expect(within(rules).getAllByRole('listitem').every((li) => li.classList.contains('ko'))).toBe(true);

    await user.type(screen.getByLabelText('Mot de passe'), 'A');
    expect(within(rules).getByText('Une majuscule').closest('li')).toHaveClass('ok');
    expect(within(rules).getByText('Un chiffre').closest('li')).toHaveClass('ko');

    await user.type(screen.getByLabelText('Mot de passe'), 'bcdef1!');
    expect(within(rules).getAllByRole('listitem').every((li) => li.classList.contains('ok'))).toBe(true);
  });

  it("l'œil affiche puis masque le mot de passe", async () => {
    const user = await openRegister();
    const input = screen.getByLabelText('Mot de passe');
    expect(input).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: 'Afficher le mot de passe' }));
    expect(input).toHaveAttribute('type', 'text');
    await user.click(screen.getByRole('button', { name: 'Masquer le mot de passe' }));
    expect(input).toHaveAttribute('type', 'password');
  });

  it('refuse un mot de passe faible avec le message imposé, sans appeler l’API', async () => {
    const user = await openRegister();
    await user.type(screen.getByLabelText('E-mail'), 'a@b.fr');
    await user.type(screen.getByLabelText('Mot de passe'), 'password');
    await user.click(screen.getByRole('button', { name: 'Créer mon compte' }));
    expect(screen.getByText('Très bof le mot de passe.')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('Mot de passe'), 'X'); // retaper efface l'erreur
    expect(screen.queryByText('Très bof le mot de passe.')).not.toBeInTheDocument();
  });

  it('crée le compte avec un mot de passe valide et ouvre la liste', async () => {
    fetchMock.mockImplementation((url) => {
      if (url.endsWith('/auth/register')) return json({ token: 't', user: { email: 'a@b.fr', name: 'Ada' } }, 201);
      if (url.includes('/stats/summary')) return json({ total: 0, byStatus: { todo: 0, doing: 0, done: 0 }, completionRate: 0, overdue: 0, byPriority: {} });
      return json([]);
    });
    const user = await openRegister();
    await user.type(screen.getByLabelText('E-mail'), 'a@b.fr');
    await user.type(screen.getByLabelText('Mot de passe'), 'Soudure1!');
    await user.click(screen.getByRole('button', { name: 'Créer mon compte' }));
    expect(await screen.findByText('Aucune étape pour l’instant')).toBeInTheDocument();
    expect(localStorage.getItem('myelektro_token')).toBe('t');
  });
});

describe('connexion', () => {
  it("n'impose aucune règle de complexité et montre l'erreur de l'API", async () => {
    fetchMock.mockReturnValue(json({ error: 'Identifiants incorrects' }, 401));
    const user = userEvent.setup();
    renderApp('/login');
    await user.type(screen.getByLabelText('E-mail'), 'a@b.fr');
    await user.type(screen.getByLabelText('Mot de passe'), 'simple');
    await user.click(screen.getByRole('button', { name: 'Se connecter' }));
    await waitFor(() => expect(screen.getByText('Identifiants incorrects')).toBeInTheDocument());
    expect(screen.queryByRole('list', { name: 'Conditions du mot de passe' })).not.toBeInTheDocument();
  });
});
