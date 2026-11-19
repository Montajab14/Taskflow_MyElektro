import { useRef, useState } from 'react';
import { api } from '../api/client';
import useAsync from '../lib/useAsync';
import { addDays, formatDate, plural, todayLocal } from '../lib/dates';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';
import Icon from '../components/Icon';
import ErrorPanel from '../components/ErrorPanel';

const STRIP_DAYS = 14;

function HabitRow({ habit, doneDays, today, refresh }) {
  const confirm = useConfirm();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const { stats } = habit;

  async function toggle() {
    setBusy(true);
    try {
      if (stats.doneToday) await api.uncheckHabit(habit.id, today);
      else await api.checkHabit(habit.id, today);
      await refresh();
    } catch (err) { toast(err.message, 'error'); }
    setBusy(false);
  }
  async function remove() {
    const ok = await confirm({ title: 'Supprimer cette habitude ?', text: `« ${habit.name} » et tous ses jours cochés seront supprimés.` });
    if (!ok) return;
    try { await api.deleteHabit(habit.id); toast('Habitude supprimée'); await refresh(); } catch (err) { toast(err.message, 'error'); }
  }

  // Les 14 derniers jours, du plus ancien à aujourd'hui : une rangée de LED
  const done = new Set(doneDays);
  return (
    <li className="habit">
      <div className="habit-main">
        <span className="habit-name">{habit.name}</span>
        {habit.description && <span className="habit-desc">{habit.description}</span>}
        <span className="habit-stats">
          Série {plural(stats.currentStreak, 'jour', 'jours')}<span className="sep">·</span>
          Record {plural(stats.longestStreak, 'jour', 'jours')}<span className="sep">·</span>
          {plural(stats.total, 'fois', 'fois')}
        </span>
      </div>
      <ol className="strip" aria-label={`${plural(done.size, 'jour coché', 'jours cochés')} sur les ${STRIP_DAYS} derniers`}>
        {Array.from({ length: STRIP_DAYS }, (_, i) => {
          const day = addDays(today, i - STRIP_DAYS + 1);
          const label = `${formatDate(day, { weekday: 'long', day: 'numeric', month: 'long' })} : ${done.has(day) ? 'fait' : 'pas fait'}`;
          return <li key={day} className={`${done.has(day) ? 'on' : ''}${day === today ? ' today' : ''}`} title={label} />;
        })}
      </ol>
      <button
        type="button" className="habit-check" disabled={busy} aria-pressed={stats.doneToday}
        aria-label={`${habit.name} : ${stats.doneToday ? 'fait aujourd’hui, cliquer pour annuler' : 'cocher pour aujourd’hui'}`}
        onClick={toggle}
      >
        <i className="led-lamp" /><span>{stats.doneToday ? 'Fait aujourd’hui' : 'À faire aujourd’hui'}</span>
      </button>
      <button type="button" className="btn danger quiet small icon-only" aria-label={`Supprimer l’habitude ${habit.name}`} onClick={remove}>
        <Icon name="trash" />
      </button>
    </li>
  );
}

export default function HabitsPage() {
  const toast = useToast();
  const input = useRef(null);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const today = todayLocal();

  const { data, error: loadError, loading, reload } = useAsync(async () => {
    const habits = await api.listHabits();
    const completions = await Promise.all(habits.map((h) => api.listCompletions(h.id, addDays(today, 1 - STRIP_DAYS), today)));
    return { habits, completions };
  }, today);

  if (loading && !data) return <p className="muted center">Chargement…</p>;
  if (loadError) return <ErrorPanel error={loadError} onRetry={reload} />;
  const { habits, completions } = data;
  const refresh = () => reload({ silent: true });

  async function onSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setError('Donnez un nom à l’habitude');
    try {
      await api.createHabit({ name: trimmed });
      setName(''); setError('');
      toast('Habitude ajoutée');
      await refresh();
      input.current?.focus();
    } catch (err) { setError(err.details?.[0]?.message || err.message); }
  }

  const doneToday = habits.filter((h) => h.stats.doneToday).length;
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Habitudes</h1>
          <p className="page-sub">
            {habits.length ? `${doneToday} sur ${habits.length} faite${doneToday > 1 ? 's' : ''} aujourd’hui` : 'Les gestes d’atelier à refaire chaque jour'}
          </p>
        </div>
      </div>
      <form className="habit-new" noValidate onSubmit={onSubmit}>
        <label className="sr-only" htmlFor="habit-name">Nouvelle habitude</label>
        <input
          id="habit-name" name="name" type="text" maxLength={80} placeholder="Nouvelle habitude" required
          ref={input} value={name} onChange={(e) => { setName(e.target.value); setError(''); }}
          className={error ? 'invalid' : undefined}
        />
        <button className="btn primary" type="submit"><Icon name="plus" />Ajouter</button>
        {error && <p className="err">{error}</p>}
      </form>
      {habits.length ? (
        <ul className="habit-list">
          {habits.map((h, i) => (
            <HabitRow key={h.id} habit={h} doneDays={completions[i].map((c) => c.date)} today={today} refresh={refresh} />
          ))}
        </ul>
      ) : (
        <div className="panel empty">
          <h2>Aucune habitude pour l’instant</h2>
          <p className="muted">Ajoutez-en une ci-dessus, puis cochez-la chaque jour pour bâtir une série</p>
        </div>
      )}
    </>
  );
}
