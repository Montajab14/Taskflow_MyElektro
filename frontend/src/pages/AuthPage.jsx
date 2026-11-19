import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PasswordField from '../components/PasswordField';
import { validateCredentials } from '../lib/validate';
import { groupErrors } from '../lib/formErrors';

const FIELDS = ['name', 'email', 'password'];

function CredentialsForm({ isRegister }) {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const p = isRegister ? 'reg' : 'login';

  const set = (field) => (value) => {
    setValues((v) => ({ ...v, [field]: value }));
    // L'erreur du dernier envoi disparaît dès que l'utilisateur retape le champ
    if (field === 'password') setErrors((e) => ({ ...e, password: undefined }));
  };

  async function onSubmit(e) {
    e.preventDefault();
    const body = { email: values.email, password: values.password };
    if (isRegister && values.name) body.name = values.name;
    const found = validateCredentials(body, { isRegister });
    if (found.length) {
      if (isRegister && found.some((er) => er.field === 'password')) setSubmitted(true);
      return setErrors(groupErrors(found, FIELDS));
    }
    setErrors({});
    setBusy(true);
    try {
      await (isRegister ? register(body) : login(body));
      navigate('/tasks');
    } catch (err) {
      setErrors(groupErrors(err.details || [], FIELDS, err.message));
      setBusy(false);
    }
  }

  const text = (field, label, type, auto, extra) => (
    <div className="field">
      <label htmlFor={`${p}-${field}`}>{label}{extra}</label>
      <input
        id={`${p}-${field}`} name={field} type={type} autoComplete={auto}
        value={values[field]} onChange={(e) => set(field)(e.target.value)}
        className={errors[field] ? 'invalid' : undefined} aria-invalid={errors[field] ? 'true' : undefined}
      />
      {errors[field] && <p className="err">{errors[field]}</p>}
    </div>
  );

  return (
    <form className="form" noValidate onSubmit={onSubmit} aria-label={isRegister ? 'Inscription' : 'Connexion'}>
      {isRegister && text('name', 'Nom ', 'text', 'name', <small>facultatif</small>)}
      {text('email', 'E-mail', 'email', 'email')}
      <PasswordField
        id={`${p}-password`} label="Mot de passe" value={values.password} onChange={set('password')}
        error={errors.password} autoComplete={isRegister ? 'new-password' : 'current-password'}
        showRules={isRegister} submitted={submitted}
      />
      {errors._form && <p className="err form-err">{errors._form}</p>}
      <button className="btn primary block" type="submit" disabled={busy}>
        {isRegister ? 'Créer mon compte' : 'Se connecter'}
      </button>
    </form>
  );
}

export default function AuthPage() {
  const [tab, setTab] = useState('login');
  return (
    <main id="view-auth" className="auth">
      <section className="auth-card">
        <div className="brand"><span className="brand-chip" aria-hidden="true" /><span className="brand-name">MyElektro</span></div>
        <p className="tagline">Chaque projet est un circuit : suivez-le étape par étape</p>
        <div className="tabs" role="tablist">
          {[['login', 'Connexion'], ['register', 'Inscription']].map(([id, label]) => (
            <button
              key={id} role="tab" className={`tab${tab === id ? ' active' : ''}`}
              aria-selected={tab === id} onClick={() => setTab(id)}
            >{label}</button>
          ))}
        </div>
        {/* key : changer d'onglet repart d'un formulaire vierge */}
        <CredentialsForm key={tab} isRegister={tab === 'register'} />
      </section>
    </main>
  );
}
