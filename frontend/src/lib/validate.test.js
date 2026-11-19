import { describe, expect, it } from 'vitest';
import { isRealDate, passwordChecks, validateCredentials, validateTask, PASSWORD_WEAK_MESSAGE } from './validate';

describe('isRealDate', () => {
  it('accepte une vraie date et refuse le 30 février', () => {
    expect(isRealDate('2026-02-28')).toBe(true);
    expect(isRealDate('2026-02-30')).toBe(false);
    expect(isRealDate('28/02/2026')).toBe(false);
  });
});

describe('validateTask', () => {
  const ok = { title: ' Souder ', status: 'todo', priority: '', description: '', dueDate: '' };
  it('nettoie le titre, met la priorité normale et une échéance vide à null', () => {
    const { errors, value } = validateTask(ok);
    expect(errors).toEqual([]);
    expect(value).toMatchObject({ title: 'Souder', priority: 'medium', dueDate: null });
  });
  it('signale titre vide, statut inconnu et description trop longue', () => {
    const { errors } = validateTask({ ...ok, title: '  ', status: 'x', description: 'a'.repeat(1001) });
    expect(errors.map((e) => e.field)).toEqual(['title', 'status', 'description']);
  });
});

describe('mot de passe', () => {
  it('passe chaque règle à ok séparément', () => {
    const state = (p) => Object.fromEntries(passwordChecks(p).map((c) => [c.id, c.ok]));
    expect(state('abc')).toEqual({ length: false, upper: false, digit: false, special: false });
    expect(state('Abcdefg1!')).toEqual({ length: true, upper: true, digit: true, special: true });
    expect(state('abcdefgh1!').upper).toBe(false);
    expect(state('Abcdefgh!').digit).toBe(false);
    expect(state('Abcdefgh1').special).toBe(false);
  });
  it("refuse à l'inscription avec le message imposé, mais pas à la connexion", () => {
    const e = validateCredentials({ email: 'a@b.fr', password: 'password' }, { isRegister: true });
    expect(e).toEqual([{ field: 'password', message: PASSWORD_WEAK_MESSAGE }]);
    expect(PASSWORD_WEAK_MESSAGE).toBe('Très bof le mot de passe.');
    expect(validateCredentials({ email: 'a@b.fr', password: 'password' }, { isRegister: false })).toEqual([]);
  });
  it('valide un mot de passe fort et un e-mail correct', () => {
    expect(validateCredentials({ email: 'a@b.fr', password: 'Soudure1!' }, { isRegister: true })).toEqual([]);
    expect(validateCredentials({ email: 'nope', password: 'x' }, { isRegister: false })[0].field).toBe('email');
  });
});
