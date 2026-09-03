import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useI18n } from '../i18n/index.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Icon } from '../components/Icon.jsx';
import { Field, Spinner } from '../components/ui.jsx';

const DEMOS = [
  { email: 'sarah.martin@campus.edu', label: 'Dr. Sarah Martin', tag: 'roles.professor' },
  { email: 'amine.benali@campus.edu', label: 'Amine Benali', tag: 'roles.student' },
  { email: 'james.carter@campus.edu', label: 'James Carter', tag: 'roles.student' },
];

export default function Login() {
  const { t, lang, setLang } = useI18n();
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError(t('auth.errorRequired'));
      return;
    }
    setBusy(true);
    try {
      const user = await login(email.trim(), password);
      toast.success(t('toast.welcome', { name: user.name.split(' ')[0] }));
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      setError(err.message && err.status === 400 ? t('auth.errorInvalid') : t('toast.networkError'));
    } finally {
      setBusy(false);
    }
  };

  const quickDemo = async (demoEmail) => {
    setBusy(true);
    setError('');
    try {
      const user = await login(demoEmail, 'password123');
      toast.success(t('toast.welcome', { name: user.name.split(' ')[0] }));
      navigate('/', { replace: true });
    } catch {
      setError(t('toast.networkError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-hero">
        <div className="brand">
          <span className="brand-badge"><Icon name="zap" size={22} strokeWidth={2} /></span>
          <div>
            <div className="brand-name">QuizFlow</div>
            <div className="brand-sub">{t('common.tagline')}</div>
          </div>
        </div>

        <div className="features">
          {[
            { icon: 'sparkles', label: t('editor.aiModalSub') },
            { icon: 'globe', label: 'Français · العربية · English' },
            { icon: 'target', label: t('dashboard.recommendedSub') },
          ].map((f, i) => (
            <div className="feature" key={i}>
              <span className="f-ico"><Icon name={f.icon} size={19} /></span>
              {f.label}
            </div>
          ))}
        </div>

        <div className="quote">
          « La révision n’est pas une répétition, c’est une conversation avec ce que vous savez déjà. »
          <div className="quote-by">QuizFlow · Plateforme d’apprentissage pour l’enseignement supérieur</div>
        </div>
      </div>

      <div className="auth-form-pane">
        <div className="auth-card fade-up">
          <div className="row-wrap mb-3" style={{ justifyContent: 'space-between' }}>
            <div className="brand" style={{ padding: 0 }}>
              <span className="brand-badge" style={{ width: 36, height: 36, borderRadius: 10 }}><Icon name="zap" size={19} strokeWidth={2} /></span>
              <span className="brand-name" style={{ color: 'var(--ink)', fontSize: 17 }}>QuizFlow</span>
            </div>
            <div className="seg">
              {['fr', 'ar', 'en'].map((l) => (
                <button key={l} className={lang === l ? 'active' : ''} onClick={() => setLang(l)} type="button">
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <h2 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>{t('auth.signInTitle')}</h2>
          <p className="muted" style={{ margin: '0 0 22px' }}>{t('auth.signInSub')}</p>

          {error && <div className="form-error"><Icon name="alertCircle" size={17} />{error}</div>}

          <form onSubmit={submit} noValidate>
            <Field label={t('auth.email')}>
              <input
                className="input"
                type="email"
                autoComplete="email"
                placeholder={t('auth.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label={t('auth.password')}>
              <input
                className="input"
                type="password"
                autoComplete="current-password"
                placeholder={t('auth.passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            <button className="btn btn-primary btn-lg btn-block" disabled={busy} type="submit">
              {busy && <Spinner size="white" />}
              {t('auth.signIn')}
            </button>
          </form>

          <p className="mt-3" style={{ textAlign: 'center' }}>
            <span className="muted">{t('auth.noAccount')} </span>
            <Link to="/register" style={{ fontWeight: 700 }}>{t('auth.signUp')}</Link>
          </p>

          <div className="demo-box">
            <div className="demo-title">{t('auth.demoTitle')}</div>
            <div className="small muted" style={{ marginTop: -4 }}>{t('auth.demoDesc')}</div>
            {DEMOS.map((d) => (
              <button key={d.email} type="button" className="demo-row" onClick={() => quickDemo(d.email)} disabled={busy}>
                <Icon name="user" size={16} />
                <b>{d.label}</b>
                <span className="badge badge-brand">{t(d.tag)}</span>
                <span className="demo-mail">{d.email}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
