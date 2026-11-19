import { useEffect, useRef } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Icon from './Icon';

/** Barre du haut + zone de contenu. Le focus passe au contenu à chaque changement de page. */
export default function Layout() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const content = useRef(null);

  useEffect(() => { content.current?.focus({ preventScroll: true }); }, [pathname]);

  return (
    <div id="view-app">
      <header className="topbar">
        <div className="topbar-left">
          <Link className="brand" to="/tasks" aria-label="MyElektro, retour aux étapes">
            <span className="brand-chip" aria-hidden="true" /><span className="brand-name">MyElektro</span>
          </Link>
          <nav className="nav" aria-label="Sections">
            <NavLink to="/tasks">Étapes</NavLink>
            <NavLink to="/habits">Habitudes</NavLink>
            <NavLink to="/activity">Activité</NavLink>
          </nav>
        </div>
        <div className="topbar-right">
          <span id="whoami" className="whoami">{user ? (user.name || user.email) : ''}</span>
          <button id="btn-logout" className="btn ghost small" aria-label="Déconnexion" onClick={logout}>
            <Icon name="logout" /><span className="btn-label">Déconnexion</span>
          </button>
        </div>
      </header>
      <main className="container" id="content" tabIndex={-1} ref={content}>
        <Outlet />
      </main>
    </div>
  );
}
