import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useI18n } from '../i18n/index.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Icon } from '../components/Icon.jsx';
import { Avatar, Menu } from '../components/ui.jsx';

const TITLES = {
  '/': { title: 'nav.dashboard', sub: 'dashboard.welcomeSub' },
  '/quizzes': { title: 'quizzes.title', sub: 'quizzes.subtitle' },
  '/quizzes/new': { title: 'editor.newQuizTitle', sub: 'editor.newQuizSub' },
  '/scores': { title: 'scores.title', sub: 'scores.subtitle' },
  '/students': { title: 'students.title', sub: 'students.subtitle' },
  '/settings': { title: 'settings.title', sub: 'settings.subtitle' },
};

export default function DashboardLayout() {
  const { user, logout, isProfessor } = useAuth();
  const { t, lang, setLang } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawer, setDrawer] = useState(false);

  useEffect(() => setDrawer(false), [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = drawer ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawer]);

  const dynamicTitle = () => {
    const playMatch = location.pathname.match(/^\/quizzes\/(\d+)\/play$/);
    const editMatch = location.pathname.match(/^\/quizzes\/(\d+)\/edit$/);
    if (playMatch) return { title: 'player.resultTitle', sub: null };
    if (editMatch) return { title: 'nav.quizzes', sub: 'editor.editQuizSub' };
    return null;
  };

  const head = dynamicTitle() || TITLES[location.pathname] || { title: 'common.appName', sub: null };

  const doLogout = () => {
    logout();
    toast.info(t('toast.loggedOut'));
    navigate('/login');
  };

  const langs = ['fr', 'en', 'ar'];

  const navItems = (
    <>
      <div className="nav-label">{t('nav.mainSection')}</div>
      <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <Icon name="dashboard" size={19} />
        {t('nav.dashboard')}
      </NavLink>
      <NavLink to="/quizzes" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <Icon name="quiz" size={19} />
        {t('nav.quizzes')}
      </NavLink>
      <NavLink to="/scores" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <Icon name="scores" size={19} />
        {t('nav.scores')}
      </NavLink>
      {isProfessor && (
        <NavLink to="/students" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Icon name="students" size={19} />
          {t('nav.students')}
        </NavLink>
      )}
      <div className="nav-label">{t('nav.accountSection')}</div>
      <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <Icon name="settings" size={19} />
        {t('nav.settings')}
      </NavLink>
    </>
  );

  return (
    <div className="shell">
      {drawer && <div className="scrim" onClick={() => setDrawer(false)} />}
      <aside className={`sidebar ${drawer ? 'open' : ''}`}>
        <div className="brand">
          <span className="brand-badge">
            <Icon name="zap" size={22} strokeWidth={2} />
          </span>
          <div>
            <div className="brand-name">QuizFlow</div>
            <div className="brand-sub">{t('common.tagline')}</div>
          </div>
        </div>

        <nav className="nav">{navItems}</nav>

        <div className="sidebar-foot">
          <div className="ai-hint">
            <Icon name="sparkles" size={18} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              <b>{t('editor.aiButton')}</b>
              {t('editor.aiButtonSub')}
            </span>
          </div>
          <NavLink to="/quizzes/new" className="btn btn-primary btn-block" style={{ marginBottom: 12 }}>
            <Icon name="plus" size={17} />
            {t('nav.newQuiz')}
          </NavLink>
          <button className="user-card" onClick={() => navigate('/settings')}>
            <Avatar name={user?.name ?? ""} color={user?.avatarColor} />
            <span style={{ minWidth: 0, textAlign: 'start' }}>
              <span className="u-name" style={{ display: 'block' }}>{user?.name ?? ""}</span>
              <span className="u-role">{t(`roles.${user?.role}`)} · {t(`levels.${user?.academicLevel}`)}</span>
            </span>
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="icon-btn burger" onClick={() => setDrawer(true)} aria-label={t('nav.menu')}>
            <Icon name="menu" size={19} />
          </button>
          <div style={{ minWidth: 0 }}>
            <h1>{t(head.title)}</h1>
            {head.sub && <div className="subtitle">{t(head.sub)}</div>}
          </div>
          <div className="topbar-actions">
            <Menu
              trigger={
                <button className="icon-btn" aria-label="language">
                  <Icon name="globe" size={18} />
                </button>
              }
              items={langs.map((l) => ({
                label: `${l === lang ? '✓  ' : '    '}${t(`lang.${l}`)}`,
                onClick: () => setLang(l),
              }))}
            />
            <Menu
              trigger={
                <button style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', borderRadius: '50%' }} aria-label="account">
                  <Avatar name={user?.name ?? ""} color={user?.avatarColor} size={38} />
                </button>
              }
              items={[
                { label: t('nav.settings'), icon: 'settings', onClick: () => navigate('/settings') },
                'divider',
                { label: t('nav.signOut'), icon: 'logout', danger: true, onClick: doLogout },
              ]}
            />
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
