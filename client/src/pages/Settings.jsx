import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { getAiKey, getAiProvider, setAiKey, setAiProvider } from '../api/aiKey.js';
import { useI18n } from '../i18n/index.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Icon } from '../components/Icon.jsx';
import { Avatar, Badge, Field, Spinner } from '../components/ui.jsx';

const LEVELS = ['L1', 'L2', 'L3', 'M1', 'M2'];
const LANGS = ['fr', 'en', 'ar'];
const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#14b8a6', '#0ea5e9'];

function Card({ icon, title, sub, children }) {
  return (
    <section className="card card-pad fade-up">
      <div className="card-head">
        <div className="row" style={{ gap: 12 }}>
          <span className="subject-icon" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
            <Icon name={icon} size={19} />
          </span>
          <div>
            <h3 className="card-title">{title}</h3>
            <p className="muted small" style={{ margin: 0 }}>{sub}</p>
          </div>
        </div>
      </div>
      {children}
    </section>
  );
}

export default function Settings() {
  const { t, lang, setLang, fmtDate } = useI18n();
  const { user, updateUser, logout, isProfessor } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [profile, setProfile] = useState({ name: user?.name || '', avatarColor: user?.avatarColor || COLORS[0] });
  const [prefs, setPrefs] = useState({ academicLevel: user?.academicLevel || 'L1', preferredLanguage: user?.preferredLanguage || 'fr' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);

  const [pwd, setPwd] = useState({ current: '', next: '' });
  const [savingPwd, setSavingPwd] = useState(false);

  const [aiStatus, setAiStatus] = useState(null);
  const [apiKeyInput, setApiKeyInput] = useState(getAiKey());
  const [providerInput, setProviderInput] = useState(getAiProvider());

  useEffect(() => {
    api('/ai/status')
      .then(setAiStatus)
      .catch(() => {});
  }, [apiKeyInput]);

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const data = await api('/auth/profile', { method: 'PUT', body: profile });
      updateUser(data.user);
      toast.success(t('settings.profileSaved'));
    } catch (err) {
      toast.error(err.message || t('toast.serverError'));
    } finally {
      setSavingProfile(false);
    }
  };

  const savePrefs = async (next) => {
    const payload = next || prefs;
    setSavingPrefs(true);
    try {
      const data = await api('/auth/profile', { method: 'PUT', body: payload });
      updateUser(data.user);
      if (data.user.preferredLanguage !== lang) setLang(data.user.preferredLanguage);
      toast.success(t('settings.prefsSaved'));
    } catch (err) {
      toast.error(err.message || t('toast.serverError'));
    } finally {
      setSavingPrefs(false);
    }
  };

  const changePassword = async () => {
    if (!pwd.current || pwd.next.length < 8) {
      toast.error(t('auth.errorShortPassword'));
      return;
    }
    setSavingPwd(true);
    try {
      await api('/auth/password', { method: 'PUT', body: { currentPassword: pwd.current, newPassword: pwd.next } });
      toast.success(t('settings.passwordSaved'));
      setPwd({ current: '', next: '' });
    } catch (err) {
      toast.error(err.status === 400 ? t('settings.pwdMismatch') : err.message || t('toast.serverError'));
    } finally {
      setSavingPwd(false);
    }
  };

  const storeKey = () => {
    setAiKey(apiKeyInput.trim());
    setAiProvider(providerInput);
    toast.success(t('settings.aiKeySaved'));
  };
  const removeKey = () => {
    setAiKey('');
    setApiKeyInput('');
    toast.info(t('settings.aiKeyRemoved'));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 820 }}>
      {/* Profile */}
      <Card icon="user" title={t('settings.profileCard')} sub={t('settings.profileSub')}>
        <div className="row-wrap" style={{ gap: 20, alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <Avatar name={profile.name || user.name} color={profile.avatarColor} size={64} />
            <div className="row" style={{ gap: 5, flexWrap: 'wrap', maxWidth: 150, justifyContent: 'center' }}>
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setProfile((p) => ({ ...p, avatarColor: c }))}
                  aria-label={c}
                  style={{
                    width: 22, height: 22, borderRadius: '50%', background: c, cursor: 'pointer',
                    border: profile.avatarColor === c ? '2.5px solid var(--ink)' : '2px solid transparent',
                    outline: '1px solid var(--line)',
                  }}
                />
              ))}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 260 }}>
            <Field label={t('settings.fullName')}>
              <input className="input" value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} />
            </Field>
            <div className="form-row">
              <Field label={t('settings.email')}>
                <input className="input" value={user.email} disabled style={{ opacity: 0.65 }} />
              </Field>
              <Field label={t('settings.role')}>
                <input className="input" value={t(`roles.${user.role}`)} disabled style={{ opacity: 0.65 }} />
              </Field>
            </div>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={saveProfile} disabled={savingProfile || !profile.name.trim()}>
                {savingProfile && <Spinner size="white" />}
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Preferences */}
      <Card icon="globe" title={t('settings.prefsCard')} sub={t('settings.prefsSub')}>
        <div className="form-row">
          <Field label={t('settings.uiLanguage')} hint={t('settings.uiLanguageHint')}>
            <select
              className="select"
              value={prefs.preferredLanguage}
              onChange={(e) => {
                const v = e.target.value;
                setPrefs((p) => ({ ...p, preferredLanguage: v }));
                setLang(v); // instant UI switch
              }}
            >
              {LANGS.map((l) => (
                <option key={l} value={l}>{t(`lang.${l}`)}</option>
              ))}
            </select>
          </Field>
          <Field label={t('settings.levelLabel')}>
            <select className="select" value={prefs.academicLevel} onChange={(e) => setPrefs((p) => ({ ...p, academicLevel: e.target.value }))}>
              {LEVELS.map((l) => (
                <option key={l} value={l}>{t(`levels.${l}`)}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={() => savePrefs()} disabled={savingPrefs}>
            {savingPrefs && <Spinner size="white" />}
            {t('common.save')}
          </button>
        </div>
      </Card>

      {/* AI integration */}
      <Card icon="sparkles" title={t('settings.aiCard')} sub={t('settings.aiSub')}>
        <div className="row-wrap mb-2" style={{ gap: 8 }}>
          {aiStatus?.envProvider ? (
            <Badge color="green" icon={<Icon name="checkCircle" size={12} />}>
              {t('settings.aiStatusEnv', { provider: aiStatus.envProvider })}
            </Badge>
          ) : (
            <Badge color="amber" icon={<Icon name="info" size={12} />}>{t('settings.aiStatusNone')}</Badge>
          )}
          {aiStatus?.models && <span className="cell-muted small">{aiStatus.models.gemini} · {aiStatus.models.openai}</span>}
        </div>

        <Field label={t('settings.aiProviderLabel')}>
          <div className="seg" role="group">
            {['auto', 'gemini', 'openai'].map((p) => (
              <button key={p} type="button" className={providerInput === p ? 'active' : ''} onClick={() => setProviderInput(p)}>
                {p === 'auto' ? 'Auto' : p === 'gemini' ? 'Gemini' : 'OpenAI'}
              </button>
            ))}
          </div>
        </Field>
        <Field label={t('settings.aiUserKeyTitle')} hint={t('settings.aiUserKeyHint')}>
          <input
            className="input"
            type="password"
            placeholder={t('settings.aiKeyPlaceholder')}
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            autoComplete="off"
          />
        </Field>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          {getAiKey() && (
            <button className="btn btn-danger-soft" onClick={removeKey}>
              <Icon name="trash" size={15} />
              {t('settings.removeKey')}
            </button>
          )}
          <button className="btn btn-primary" onClick={storeKey} disabled={!apiKeyInput.trim()}>
            <Icon name="key" size={15} />
            {t('settings.saveKey')}
          </button>
        </div>
      </Card>

      {/* Password */}
      <Card icon="key" title={t('settings.passwordCard')} sub={t('settings.passwordSub')}>
        <div className="form-row">
          <Field label={t('settings.currentPassword')}>
            <input className="input" type="password" value={pwd.current} onChange={(e) => setPwd((p) => ({ ...p, current: e.target.value }))} autoComplete="current-password" />
          </Field>
          <Field label={t('settings.newPassword')}>
            <input className="input" type="password" value={pwd.next} onChange={(e) => setPwd((p) => ({ ...p, next: e.target.value }))} autoComplete="new-password" />
          </Field>
        </div>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={changePassword} disabled={savingPwd || !pwd.current || pwd.next.length < 8}>
            {savingPwd && <Spinner size="white" />}
            {t('settings.updatePassword')}
          </button>
        </div>
      </Card>

      {/* Account */}
      <Card icon="settings" title={t('settings.accountCard')} sub={t('settings.accountSub')}>
        <div className="row-wrap" style={{ justifyContent: 'space-between' }}>
          <span className="cell-muted">
            {t('settings.memberSince')} <b style={{ color: 'var(--ink-soft)' }}>{fmtDate(user.createdAt)}</b>
            {isProfessor && <> · {t('roles.professor')}</>}
          </span>
          <button
            className="btn btn-danger-soft"
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            <Icon name="logout" size={15} />
            {t('nav.signOut')}
          </button>
        </div>
      </Card>
    </div>
  );
}
