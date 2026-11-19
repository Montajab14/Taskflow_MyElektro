import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import useAsync from '../lib/useAsync';
import { PRIORITY_LABELS, STATUS_LABELS } from '../lib/labels';
import { PRIORITIES, STATUSES, validateTask } from '../lib/validate';
import { groupErrors } from '../lib/formErrors';
import { useToast } from '../context/ToastContext';
import ErrorPanel from '../components/ErrorPanel';

const EMPTY = { title: '', status: 'todo', priority: 'medium', description: '', dueDate: '' };
const FIELDS = ['title', 'status', 'priority', 'dueDate', 'description'];

function TaskForm({ id, initial }) {
  const navigate = useNavigate();
  const toast = useToast();
  const title = useRef(null);
  const [values, setValues] = useState({
    title: initial.title, status: initial.status, priority: initial.priority || 'medium',
    description: initial.description || '', dueDate: initial.dueDate || '',
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => { title.current?.focus(); }, []);
  const bind = (name) => ({
    id: { title: 'f-title', status: 'f-status', priority: 'f-priority', dueDate: 'f-due', description: 'f-desc' }[name],
    name, value: values[name],
    onChange: (e) => setValues((v) => ({ ...v, [name]: e.target.value })),
    className: errors[name] ? 'invalid' : undefined,
  });
  const err = (name) => errors[name] && <p className="err">{errors[name]}</p>;

  async function onSubmit(e) {
    e.preventDefault();
    const { errors: found, value } = validateTask(values);
    if (found.length) return setErrors(groupErrors(found, FIELDS));
    setErrors({});
    setBusy(true);
    try {
      const saved = id ? await api.updateTask(id, value) : await api.createTask(value);
      toast(id ? 'Étape enregistrée' : 'Étape ajoutée');
      navigate(`/tasks/${encodeURIComponent(saved.id)}`);
    } catch (e2) {
      setErrors(groupErrors(e2.details || [], FIELDS, e2.message));
      setBusy(false);
    }
  }

  return (
    <form className="form panel" noValidate onSubmit={onSubmit}>
      <h1>{id ? 'Modifier l’étape' : 'Nouvelle étape'}</h1>
      <div className="field">
        <label htmlFor="f-title">Titre<small>1 à 120 caractères</small></label>
        <input {...bind('title')} ref={title} type="text" maxLength={200} required />
        {err('title')}
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="f-status">Statut</label>
          <select {...bind('status')}>{STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}</select>
          {err('status')}
        </div>
        <div className="field">
          <label htmlFor="f-priority">Priorité</label>
          <select {...bind('priority')}>{PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}</select>
          {err('priority')}
        </div>
        <div className="field">
          <label htmlFor="f-due">Échéance<small>facultative</small></label>
          <input {...bind('dueDate')} type="date" />
          {err('dueDate')}
        </div>
      </div>
      <div className="field">
        <label htmlFor="f-desc">Description<small>1000 caractères au plus</small></label>
        <textarea {...bind('description')} rows={5} />
        <p className="counter">{values.description.length} / 1000</p>
        {err('description')}
      </div>
      {errors._form && <p className="err form-err">{errors._form}</p>}
      <div className="actions">
        <button className="btn primary" type="submit" disabled={busy}>{id ? 'Enregistrer' : 'Ajouter'}</button>
        <Link className="btn ghost" to={id ? `/tasks/${encodeURIComponent(id)}` : '/tasks'}>Annuler</Link>
      </div>
    </form>
  );
}

export default function TaskFormPage() {
  const { id } = useParams();
  const { data, error, loading } = useAsync(() => (id ? api.getTask(id) : Promise.resolve(EMPTY)), id || 'new');
  if (loading) return <p className="muted center">Chargement…</p>;
  if (error) return <ErrorPanel error={error} />;
  return <TaskForm key={id || 'new'} id={id} initial={data} />;
}
