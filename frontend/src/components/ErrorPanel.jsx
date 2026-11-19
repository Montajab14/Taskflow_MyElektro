import { Link } from 'react-router-dom';

export default function ErrorPanel({ error, onRetry }) {
  return (
    <div className="panel error-panel" role="alert">
      <p>{error.message}</p>
      <div className="actions">
        {onRetry && <button className="btn ghost small" onClick={onRetry}>Réessayer</button>}
        <Link className="btn ghost small" to="/tasks">Retour aux étapes</Link>
      </div>
    </div>
  );
}
