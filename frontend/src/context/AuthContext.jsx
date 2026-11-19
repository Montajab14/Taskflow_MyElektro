import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, session, UNAUTHORIZED_EVENT } from '../api/client';
import { useToast } from './ToastContext';

const AuthContext = createContext(null);

/** Garde la session (jeton + utilisateur) ; le jeton est conservé dans le localStorage. */
export function AuthProvider({ children }) {
  const toast = useToast();
  const [state, setState] = useState(() => ({ token: session.getToken(), user: session.getUser() }));

  const open = useCallback((data) => {
    session.set(data);
    setState({ token: data.token, user: data.user });
  }, []);

  const login = useCallback(async (credentials) => open(await api.login(credentials)), [open]);
  const register = useCallback(async (credentials) => open(await api.register(credentials)), [open]);
  const logout = useCallback(() => {
    session.clear();
    setState({ token: null, user: null });
  }, []);

  // Le client HTTP signale un 401 : la session est expirée ou le jeton refusé.
  useEffect(() => {
    const onUnauthorized = () => {
      setState({ token: null, user: null });
      toast('Session expirée, reconnectez-vous', 'error');
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [toast]);

  const value = useMemo(
    () => ({ user: state.user, isLoggedIn: !!state.token, login, register, logout }),
    [state, login, register, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
