import { STATUS_LABELS } from '../lib/labels';
import Icon from './Icon';

/** Statut d'une étape, affiché comme une LED (rouge, orange, verte). */
export function Led({ status }) {
  return <span className={`led led-${status}`}><i /><span>{STATUS_LABELS[status] || status}</span></span>;
}

/** Priorité affichée seulement quand elle sort de l'ordinaire. */
export function PriorityTag({ priority }) {
  if (priority === 'high') return <span className="prio prio-high"><Icon name="up" />Priorité haute</span>;
  if (priority === 'low') return <span className="prio prio-low"><Icon name="down" />Priorité basse</span>;
  return null;
}
