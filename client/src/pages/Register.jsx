import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useI18n } from '../i18n/index.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Icon } from '../components/Icon.jsx';
import { Field, Spinner } from '../components/ui.jsx';

const LEVELS = ['L1', 'L2', 'L3', 'M1', 'M2'];
const LANGS = ['fr', 'en', 'ar'];

export default function Register() {
  const { t, lang, setLang } = useI18n();
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirm: '',
    role: 'student',
    academicLevel: 'L1',
    preferredLanguage: lang,
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setError(t('auth.errorRequired'));
      return;
    }
    if (form.password.length < 8) {
      setError(t('auth.errorShortPassword'));
      return;
    }
    if (form.password !== form.confirm) {
      setError(t('auth.errorPasswordMatch'));
      return;
    }
    setBusy(true);
    try {
      const user = await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        academicLevel: form.academicLevel,
        preferredLanguage: form.preferredLanguage,
      });
      toast.success(t('toast.accountCreated', { name: user.name.split(' ')[0] }));
      navigate('/', { replace: true });
    } catch (err) {
      if (err.status === 400 && /exists/i.test(err.message || '')) setError(t('auth.errorEmailUsed'));
      else setError(err.status === 0 ? t('toast.networkError') : t('errors.generic'));
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
        <div className="quote">
          « Des quiz adaptés à votre niveau, générés par l’IA, dans votre langue. »
          <div className="quote-by">QuizFlow · {t('common.tagline')}</div>
        </div>
      </div>

      <div className="auth-form-pane">
        <div className="auth-card fade-up">
          <div className="row-wrap mb-3" style={{ justifyContent: 'space-between' }}>
            <Link to="/login" className="btn btn-secondary btn-sm">
              <Icon name="chevronLeft" size={15} className="flip-x" />
              {t('common.back')}
            </Link>
            <div className="seg">
              {LANGS.map((l) => (
                <button key={l} className={lang === l ? 'active' : ''} onClick={() => setLang(l)} type="button">
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <h2 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>{t('auth.signUpTitle')}</h2>
          <p className="muted" style={{ margin: '0 0 22px' }}>{t('auth.signUpSub')}</p>

          {error && <div className="form-error"><Icon name="alertCircle" size={17} />{error}</div>}

          <form onSubmit={submit} noValidate>
            <Field label={t('auth.name')}>
              <input className="input" placeholder={t('auth.namePlaceholder')} value={form.name} onChange={set('name')} />
            </Field>
            <Field label={t('auth.email')}>
              <input className="input" type="email" autoComplete="email" placeholder={t('auth.emailPlaceholder')} value={form.email} onChange={set('email')} />
            </Field>
            <div className="form-row">
              <Field label={t('auth.password')}>
                <input className="input" type="password" autoComplete="new-password" placeholder={t('auth.passwordPlaceholder')} value={form.password} onChange={set('password')} />
              </Field>
              <Field label={t('auth.confirmPassword')}>
                <input className="input" type="password" autoComplete="new-password" placeholder={t('auth.passwordPlaceholder')} value={form.confirm} onChange={set('confirm')} />
              </Field>
            </div>

            <Field label={t('auth.role')}>
              <div className="seg" style={{ width: '100%' }}>
                {['student', 'professor'].map((r) => (
                  <button
                    key={r}
                    type="button"
                    className={form.role === r ? 'active' : ''}
                    style={{ flex: 1 }}
                    onClick={() => setForm((f) => ({ ...f, role: r }))}
                  >
                    {t(`auth.role${r === 'student' ? 'Student' : 'Professor'}`)}
                  </button>
                ))}
              </div>
            </Field>

            <div className="form-row">
              <Field label={t('auth.level')} hint={t('auth.levelHint')}>
                <select className="select" value={form.academicLevel} onChange={set('academicLevel')}>
                  {LEVELS.map((l) => (
                    <option key={l} value={l}>{t(`levels.${l}`)}</option>
                  ))}
                </select>
              </Field>
              <Field label={t('auth.language')}>
                <select className="select" value={form.preferredLanguage} onChange={set('preferredLanguage')}>
                  {LANGS.map((l) => (
                    <option key={l} value={l}>{t(`lang.${l}`)}</option>
                  ))}
                </select>
              </Field>
            </div>

            <button className="btn btn-primary btn-lg btn-block" disabled={busy} type="submit">
              {busy && <Spinner size="white" />}
              {t('auth.signUp')}
            </button>
          </form>

          <p className="mt-3" style={{ textAlign: 'center' }}>
            <span className="muted">{t('auth.haveAccount')} </span>
            <Link to="/login" style={{ fontWeight: 700 }}>{t('auth.signIn')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
