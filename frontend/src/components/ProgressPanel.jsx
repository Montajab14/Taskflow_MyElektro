import { STATUS_LABELS } from '../lib/labels';
import { plural } from '../lib/dates';
import Icon from './Icon';

/** Barre d'avancement, à partir du résumé calculé par l'API. */
export default function ProgressPanel({ summary }) {
  const { total, byStatus } = summary;
  const pct = (n) => `${((n / total) * 100).toFixed(2)}%`;
  const rate = Math.round(summary.completionRate * 100);
  return (
    <section className="panel progress" aria-label="Avancement">
      <div className="progress-head">
        <h2>Avancement</h2>
        <div className="progress-figure">
          <strong>{rate} %</strong>
          <span>{plural(byStatus.done, 'étape validée', 'étapes validées')} sur {total}</span>
        </div>
      </div>
      <div className="track" role="img" aria-label={`${byStatus.done} validées, ${byStatus.doing} sur le bench, ${byStatus.todo} à faire`}>
        <span className="seg seg-done" style={{ width: pct(byStatus.done) }} />
        <span className="seg seg-doing" style={{ width: pct(byStatus.doing) }} />
      </div>
      <ul className="stats">
        {['todo', 'doing', 'done'].map((s) => (
          <li key={s} className={`stat stat-${s} led led-${s}`}><i /><span>{STATUS_LABELS[s]}</span><strong>{byStatus[s]}</strong></li>
        ))}
        {summary.overdue > 0 && (
          <li className="stat stat-overdue"><Icon name="alert" /><span>En retard</span><strong>{summary.overdue}</strong></li>
        )}
      </ul>
    </section>
  );
}
