import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import useAsync from '../lib/useAsync';
import { PRIORITY_LABELS } from '../lib/labels';
import { formatDate, isOverdue, isoDay } from '../lib/dates';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';
import Icon from '../components/Icon';
import { Led } from '../components/Led';
import ErrorPanel from '../components/ErrorPanel';

export default function TaskDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const toast = useToast();
  const { data: task, error, loading } = useAsync(() => api.getTask(id), id);

  if (loading) return <p className="muted center">Chargement…</p>;
  if (error) return <ErrorPanel error={error} />;

  async function remove() {
    const ok = await confirm({ title: 'Supprimer cette étape ?', text: `« ${task.title} » sera définitivement supprimée.` });
    if (!ok) return;
    try {
      await api.deleteTask(task.id);
      toast('Étape supprimée');
      navigate('/tasks');
    } catch (err) { toast(err.message, 'error'); }
  }

  const late = isOverdue(task);
  const priority = task.priority || 'medium';
  return (
    <>
      <Link className="back" to="/tasks"><Icon name="back" />Retour aux étapes</Link>
      <article className="panel detail">
        <div className="detail-head"><h1>{task.title}</h1><Led status={task.status} /></div>
        <dl>
          <dt>Échéance</dt>
          <dd className={`date${late ? ' overdue' : ''}`}>{(late ? 'En retard · ' : '') + formatDate(task.dueDate)}</dd>
          <dt>Priorité</dt>
          <dd className={`prio-text prio-${priority}`}>{PRIORITY_LABELS[priority]}</dd>
          {task.completedAt && (<><dt>Validée le</dt><dd className="date">{formatDate(isoDay(new Date(task.completedAt)))}</dd></>)}
          <dt>Description</dt>
          <dd className={task.description ? 'prewrap' : 'muted'}>{task.description || 'Aucune description'}</dd>
        </dl>
        <div className="actions">
          <Link className="btn primary" to={`/tasks/${encodeURIComponent(task.id)}/edit`}><Icon name="pencil" />Modifier</Link>
          <span className="spacer" />
          <button className="btn danger quiet" onClick={remove}><Icon name="trash" />Supprimer</button>
        </div>
      </article>
    </>
  );
}
