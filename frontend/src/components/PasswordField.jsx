import { useState } from 'react';
import { passwordChecks } from '../lib/validate';
import Icon from './Icon';

/**
 * Champ mot de passe avec l'icône œil (afficher / masquer).
 * Avec showRules : checklist des règles sous le champ, ✗ puis ✓ en direct.
 * submitted : après un envoi refusé, les règles manquantes passent en rouge.
 */
export default function PasswordField({
  id, name = 'password', label, value, onChange, error, autoComplete, showRules = false, submitted = false,
}) {
  const [visible, setVisible] = useState(false);
  const rulesId = `${id}-rules`;

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="pw-wrap">
        <input
          id={id} name={name} type={visible ? 'text' : 'password'} autoComplete={autoComplete}
          value={value} onChange={(e) => onChange(e.target.value)}
          className={error ? 'invalid' : undefined}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={showRules ? rulesId : undefined}
        />
        <button
          type="button" className="pw-toggle" aria-pressed={visible}
          aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          onClick={() => setVisible((v) => !v)}
        >
          <Icon name={visible ? 'eyeOff' : 'eye'} />
        </button>
      </div>
      {showRules && (
        <ul className={`pw-rules${submitted ? ' submitted' : ''}`} id={rulesId} aria-label="Conditions du mot de passe">
          {passwordChecks(value).map((c) => (
            <li key={c.id} className={c.ok ? 'ok' : 'ko'}>
              <Icon name={c.ok ? 'check' : 'x'} />
              <span>{c.label}</span>
              <span className="sr-only">{c.ok ? ' : respectée' : ' : non respectée'}</span>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="err">{error}</p>}
    </div>
  );
}
