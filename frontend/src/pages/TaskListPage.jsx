import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import useAsync from '../lib/useAsync';
import { STATUS_LABELS, SORTS } from '../lib/labels';
import { formatDate, isOverdue } from '../lib/dates';
import Icon from '../components/Icon';
import { Led, PriorityTag } from '../components/Led';
import ProgressPanel from '../components/ProgressPanel';
import ErrorPanel from '../components/ErrorPanel';

const SEGMENTS = [['', 'Toutes'], ['todo', STATUS_LABELS.todo], ['doing', STATUS_LABELS.doing], ['done', STATUS_LABELS.done]];
const NO_FILTERS = { status: '', q: '', sort: '-createdAt', overdue: false };

function TaskRow({ task }) {
  const late = isOverdue(task);
  return (
    <li className={`task-card status-${task.status}`}>
      <Link className="task-main" to={`/tasks/${encodeURIComponent(task.id)}`}>
        <span className="task-title">{task.title}</span>
        <span className="task-meta">
          <span className={`task-due${late ? ' overdue' : ''}`}>
            {late && <Icon name="alert" />}{(late ? 'En retard · ' : '') + formatDate(task.dueDate)}
          </span>
          <PriorityTag priority={task.priority} />
        </span>
      </Link>
      <Led status={task.status} />
    </li>
  );
}

function Results({ filters, onClear }) {
  const [state, setState] = useState({ tasks: null, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController(); // une recherche plus récente annule la précédente
    api.listTasks(
      { status: filters.status, q: filters.q, sort: filters.sort, overdue: filters.overdue ? 'true' : '' },
      { signal: controller.signal },
    ).then((tasks) => {
      // Les étapes sans échéance passent après les autres quand on trie par échéance
      if (filters.sort === 'dueDate') tasks.sort((a, b) => (!a.dueDate) - (!b.dueDate));
      setState({ tasks, error: null });
    }).catch((error) => {
      if (error.name !== 'AbortError') setState({ tasks: null, error });
    });
    return () => controller.abort();
  }, [filters, attempt]);

  if (state.error) return <ErrorPanel error={state.error} onRetry={() => setAttempt((a) => a + 1)} />;
  if (!state.tasks) return <p className="muted center">Chargement…</p>;
  if (!state.tasks.length) {
    return (
      <div className="panel empty">
        <h2>Aucune étape ne correspond</h2>
        <p className="muted">Essayez un autre statut ou une autre recherche</p>
        <button className="btn ghost" type="button" onClick={onClear}>Effacer les filtres</button>
      </div>
    );
  }
  return <ul className="task-list">{state.tasks.map((t) => <TaskRow key={t.id} task={t} />)}</ul>;
}

export default function TaskListPage() {
  const summary = useAsync(() => api.summary());
  const [filters, setFilters] = useState(NO_FILTERS);
  const [search, setSearch] = useState('');

  // La recherche part 250 ms après la dernière frappe
  useEffect(() => {
    const t = setTimeout(() => setFilters((f) => (f.q === search.trim() ? f : { ...f, q: search.trim() })), 250);
    return () => clearTimeout(t);
  }, [search]);

  const patch = (change) => setFilters((f) => ({ ...f, ...change }));
  const clear = () => { setSearch(''); setFilters(NO_FILTERS); };

  if (summary.loading && !summary.data) return <p className="muted center">Chargement…</p>;
  if (summary.error) return <ErrorPanel error={summary.error} onRetry={summary.reload} />;
  const sum = summary.data;

  const head = (
    <div className="page-head">
      <h1>Mes étapes de montage</h1>
      <Link className="btn primary" to="/tasks/new"><Icon name="plus" />Nouvelle étape</Link>
    </div>
  );
  if (sum.total === 0) {
    return (
      <>
        {head}
        <div className="panel empty">
          <h2>Aucune étape pour l’instant</h2>
          <p className="muted">Commencez par le schéma de votre prochain montage</p>
          <Link className="btn primary" to="/tasks/new"><Icon name="plus" />Ajouter ma première étape</Link>
        </div>
      </>
    );
  }
  return (
    <>
      {head}
      <ProgressPanel summary={sum} />
      <section className="list-block">
        <div className="toolbar">
          <div className="segmented" role="group" aria-label="Filtrer par statut">
            {SEGMENTS.map(([value, label]) => (
              <button key={value} type="button" aria-pressed={filters.status === value} onClick={() => patch({ status: value })}>
                {value && <i className={`dot dot-${value}`} />}{label}
              </button>
            ))}
          </div>
          <div className="toolbar-right">
            <label className="search">
              <Icon name="search" />
              <input type="search" name="q" placeholder="Rechercher" aria-label="Rechercher dans les étapes" value={search} onChange={(e) => setSearch(e.target.value)} />
            </label>
            <button type="button" className="chip" aria-pressed={filters.overdue} onClick={() => patch({ overdue: !filters.overdue })}>
              <Icon name="alert" />En retard
            </button>
            <select className="sort" aria-label="Trier" value={filters.sort} onChange={(e) => patch({ sort: e.target.value })}>
              {SORTS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
        </div>
        <div id="results"><Results filters={filters} onClear={clear} /></div>
      </section>
    </>
  );
}
