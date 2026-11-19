import { useLayoutEffect, useRef } from 'react';
import { api } from '../api/client';
import useAsync from '../lib/useAsync';
import { formatDate, parseDay, plural } from '../lib/dates';
import ErrorPanel from '../components/ErrorPanel';

function Heatmap({ heat }) {
  const scroll = useRef(null);
  // Sur un écran étroit, on montre d'abord les semaines les plus récentes
  useLayoutEffect(() => { if (scroll.current) scroll.current.scrollLeft = scroll.current.scrollWidth; }, []);

  const pad = (parseDay(heat.from).getDay() + 6) % 7; // lundi = 0
  const level = (n) => (n === 0 ? 0 : Math.min(4, Math.ceil((n / Math.max(heat.max, 1)) * 4)));
  const columns = Math.ceil((pad + heat.days.length) / 7);

  // Nom du mois au-dessus de la colonne qui contient son 1er jour
  const months = [];
  heat.days.forEach((d, i) => {
    if (d.date.endsWith('-01') || i === 0) {
      const col = Math.floor((i + pad) / 7) + 1;
      if (!months.length || col - months[months.length - 1].col >= 3) months.push({ col, label: formatDate(d.date, { month: 'short' }) });
    }
  });

  return (
    <section className="panel chart">
      <div className="chart-head">
        <h2>Étapes validées sur 12 mois</h2>
        <p className="muted">{plural(heat.total, 'étape validée', 'étapes validées')}, record de {heat.max} en un jour</p>
      </div>
      <div className="heat-scroll" ref={scroll}>
        <div className="heat" style={{ '--cols': columns }}>
          <div className="heat-months" aria-hidden="true">
            {months.map((m) => <span key={m.col} style={{ gridColumnStart: m.col }}>{m.label}</span>)}
          </div>
          <div className="heat-days" aria-hidden="true"><span>lun</span><span>mer</span><span>ven</span></div>
          <div className="heat-grid" role="img" aria-label={`${plural(heat.total, 'étape validée', 'étapes validées')} entre le ${formatDate(heat.from)} et le ${formatDate(heat.to)}`}>
            {Array.from({ length: pad }, (_, i) => <span key={`p${i}`} className="cell pad" aria-hidden="true" />)}
            {heat.days.map((d) => (
              <span
                key={d.date} className={`cell l${level(d.count)}`}
                title={`${d.count ? plural(d.count, 'étape validée', 'étapes validées') : 'Aucune étape validée'} le ${formatDate(d.date, { day: 'numeric', month: 'long', year: 'numeric' })}`}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="heat-legend" aria-hidden="true">
        Moins{[0, 1, 2, 3, 4].map((l) => <span key={l} className={`cell l${l}`} />)}Plus
      </div>
    </section>
  );
}

function Weekly({ weekly }) {
  const weeks = weekly.weeks;
  const max = Math.max(1, ...weeks.flatMap((w) => [w.created, w.completed]));
  const current = weeks[weeks.length - 1];
  return (
    <section className="panel chart">
      <div className="chart-head">
        <h2>Les 12 dernières semaines</h2>
        <ul className="legend">
          <li><i className="key key-created" />Créées</li>
          <li><i className="key key-completed" />Validées</li>
        </ul>
      </div>
      <div className="weeks" role="img" aria-label={`Cette semaine : ${plural(current.created, 'étape créée', 'étapes créées')}, ${plural(current.completed, 'validée', 'validées')}`}>
        {weeks.map((w, i) => (
          <div
            key={w.weekStart} className={`week${i === weeks.length - 1 ? ' current' : ''}`}
            title={`Semaine du ${formatDate(w.weekStart, { day: 'numeric', month: 'long' })} : ${plural(w.created, 'créée', 'créées')}, ${plural(w.completed, 'validée', 'validées')}`}
          >
            <div className="bars">
              <span className="bar bar-created" style={{ height: `${(w.created / max) * 100}%` }} />
              <span className="bar bar-completed" style={{ height: `${(w.completed / max) * 100}%` }} />
            </div>
            <span className="week-label">{formatDate(w.weekStart, { day: 'numeric', month: 'numeric' })}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

const Kpi = ({ label, value, note }) => (
  <div className="kpi"><span className="kpi-label">{label}</span><strong>{value}</strong>{note && <span className="kpi-note">{note}</span>}</div>
);

export default function ActivityPage() {
  const { data, error, loading, reload } = useAsync(
    async () => {
      const [sum, heat, weekly] = await Promise.all([api.summary(), api.heatmap(), api.weekly(12)]);
      return { sum, heat, weekly };
    });
  if (loading) return <p className="muted center">Chargement…</p>;
  if (error) return <ErrorPanel error={error} onRetry={reload} />;
  const { sum, heat, weekly } = data;
  const open = sum.byStatus.todo + sum.byStatus.doing;
  return (
    <>
      <div className="page-head"><div><h1>Activité</h1><p className="page-sub">Ce que vous avez validé, jour après jour</p></div></div>
      <div className="kpis">
        <Kpi label="Étapes" value={sum.total} note={`${open} en cours ou à faire`} />
        <Kpi label="Validées" value={`${Math.round(sum.completionRate * 100)} %`} note={plural(sum.byStatus.done, 'étape', 'étapes')} />
        <Kpi label="En retard" value={sum.overdue} note={sum.overdue ? 'échéance dépassée' : 'aucune échéance dépassée'} />
        <Kpi label="Priorité haute" value={sum.byPriority.high} note="toutes étapes confondues" />
      </div>
      <Heatmap heat={heat} />
      <Weekly weekly={weekly} />
    </>
  );
}
