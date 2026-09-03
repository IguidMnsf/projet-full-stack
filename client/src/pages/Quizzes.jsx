import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useI18n } from '../i18n/index.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Icon } from '../components/Icon.jsx';
import { Badge, ConfirmDialog, EmptyState, LangBadge, LevelBadge, Menu, PageLoading, QuizCardSkeleton } from '../components/ui.jsx';

const LEVELS = ['L1', 'L2', 'L3', 'M1', 'M2'];
const LANGS = ['fr', 'en', 'ar'];

const SUBJECT_TONES = {
  informatique: ['var(--brand-soft)', 'var(--brand)', 'quiz'],
  'computer science': ['var(--brand-soft)', 'var(--brand)', 'quiz'],
  'الإعلام الآلي': ['var(--brand-soft)', 'var(--brand)', 'quiz'],
  mathématiques: ['var(--blue-soft)', 'var(--blue)', 'scores'],
  mathematics: ['var(--blue-soft)', 'var(--blue)', 'scores'],
  الرياضيات: ['var(--blue-soft)', 'var(--blue)', 'scores'],
  physique: ['var(--amber-soft)', 'var(--amber)', 'zap'],
  physics: ['var(--amber-soft)', 'var(--amber)', 'zap'],
  الفيزياء: ['var(--amber-soft)', 'var(--amber)', 'zap'],
  biology: ['var(--green-soft)', 'var(--green)', 'book'],
  biologie: ['var(--green-soft)', 'var(--green)', 'book'],
  economics: ['#fdf2f8', '#db2777', 'scores'],
};

export default function Quizzes() {
  const { t } = useI18n();
  const { user, isProfessor } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [scope, setScope] = useState('community'); // community | mine
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('');
  const [language, setLanguage] = useState('');
  const [subject, setSubject] = useState('');
  const [sort, setSort] = useState('recent');
  const [quizzes, setQuizzes] = useState(null); // null = loading
  const [error, setError] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const debounceRef = useRef();

  const load = async (opts = {}) => {
    const params = new URLSearchParams();
    const s = opts.search ?? search;
    if (s.trim()) params.set('search', s.trim());
    if (level) params.set('level', level);
    if (language) params.set('language', language);
    if (subject) params.set('subject', subject);
    if (sort) params.set('sort', sort);
    if (scope === 'mine') params.set('mine', '1');

    try {
      const data = await api(`/quizzes?${params.toString()}`);
      setQuizzes(data);
      setError(null);
      return data;
    } catch (err) {
      setError(err);
      setQuizzes((q) => q || []);
      return [];
    }
  };

  // Load subject list once from an unfiltered community query
  useEffect(() => {
    api('/quizzes?limit=200')
      .then((data) => {
        const set = [...new Set(data.map((q) => q.subject).filter(Boolean))];
        setSubjects(set);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setQuizzes(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, level, language, subject, sort]);

  const onSearch = (value) => {
    setSearch(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load({ search: value }), 320);
  };

  /* Optimistic delete: remove instantly, restore + toast on failure. */
  const confirmDelete = async () => {
    const quiz = toDelete;
    if (!quiz) return;
    setDeleting(true);
    const snapshot = quizzes;
    setQuizzes((list) => (list || []).filter((q) => q.id !== quiz.id));
    setToDelete(null);
    try {
      await api(`/quizzes/${quiz.id}`, { method: 'DELETE' });
      toast.success(t('quizzes.deletedToast'));
    } catch (err) {
      setQuizzes(snapshot); // rollback
      toast.error(err.status === 0 ? t('toast.networkError') : err.message || t('toast.permDenied'));
    } finally {
      setDeleting(false);
    }
  };

  const hasFilters = search.trim() || level || language || subject || scope === 'mine';
  const loading = quizzes === null;

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>{scope === 'mine' ? t('quizzes.titleMine') : t('quizzes.title')}</h2>
          <p>{scope === 'mine' ? t('quizzes.subtitleMine') : t('quizzes.subtitle')}</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/quizzes/new')}>
          <Icon name="plus" size={17} />
          {t('quizzes.createCta')}
        </button>
      </div>

      {/* Toolbar */}
      <div className="card card-pad" style={{ padding: '14px 18px', marginBottom: 18 }}>
        <div className="row-wrap" style={{ gap: 12 }}>
          <div className="seg">
            <button className={scope === 'community' ? 'active' : ''} onClick={() => setScope('community')}>
              {t('quizzes.communityTab')}
            </button>
            <button className={scope === 'mine' ? 'active' : ''} onClick={() => setScope('mine')}>
              {t('quizzes.mineTab')}
            </button>
          </div>
          <div className="search-box">
            <Icon name="search" size={16} />
            <input className="input" placeholder={t('quizzes.searchPlaceholder')} value={search} onChange={(e) => onSearch(e.target.value)} />
          </div>
          <select className="select" style={{ width: 'auto', minWidth: 150 }} value={subject} onChange={(e) => setSubject(e.target.value)}>
            <option value="">{t('quizzes.allSubjects')}</option>
            {subjects.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select className="select" style={{ width: 'auto', minWidth: 120 }} value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="">{t('quizzes.allLevels')}</option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>{t(`levels.${l}`)}</option>
            ))}
          </select>
          <select className="select" style={{ width: 'auto', minWidth: 110 }} value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option value="">{t('quizzes.allLanguages')}</option>
            {LANGS.map((l) => (
              <option key={l} value={l}>{t(`lang.${l}`)}</option>
            ))}
          </select>
          <div className="seg" style={{ marginInlineStart: 'auto' }}>
            <button className={sort === 'recent' ? 'active' : ''} onClick={() => setSort('recent')}>{t('quizzes.sortRecent')}</button>
            <button className={sort === 'popular' ? 'active' : ''} onClick={() => setSort('popular')}>{t('quizzes.sortPopular')}</button>
          </div>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-2">
          {[0, 1, 2, 3, 4, 5].map((i) => <QuizCardSkeleton key={i} />)}
        </div>
      ) : error && quizzes.length === 0 ? (
        <div className="card">
          <EmptyState icon="alertCircle" title={t('toast.serverError')} action={t('common.retry')} onAction={() => load()} />
        </div>
      ) : quizzes.length === 0 ? (
        <div className="card">
          {hasFilters ? (
            <EmptyState
              icon="search"
              title={t('quizzes.emptyResults')}
              sub={t('quizzes.emptyResultsSub')}
              action={t('common.back')}
              actionIcon="refresh"
              onAction={() => { setSearch(''); setLevel(''); setLanguage(''); setSubject(''); setScope('community'); }}
            />
          ) : (
            <EmptyState
              icon="sparkles"
              title={t('quizzes.emptyTitle')}
              sub={t('quizzes.emptySub')}
              action={t('quizzes.createFirst')}
              actionIcon="plus"
              onAction={() => navigate('/quizzes/new')}
            />
          )}
        </div>
      ) : (
        <div className="grid grid-2">
          {quizzes.map((q, i) => {
            const tone = SUBJECT_TONES[q.subject?.toLowerCase()] || ['var(--brand-soft)', 'var(--brand)', 'book'];
            const canEdit = q.createdBy === user.id || user.role === 'admin';
            return (
              <div key={q.id} className="card quiz-card fade-up" style={{ animationDelay: `${Math.min(i * 40, 240)}ms` }}>
                <div className="quiz-top">
                  <div className="row" style={{ minWidth: 0 }}>
                    <span className="subject-icon" style={{ background: tone[0], color: tone[1] }}>
                      <Icon name={tone[2]} size={19} />
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <h3><Link to={`/quizzes/${q.id}/play`}>{q.title}</Link></h3>
                      <span className="small muted">{q.subject} · {t('common.by')} {q.ownerName}</span>
                    </div>
                  </div>
                  <div className="row" style={{ gap: 6 }}>
                    <LevelBadge level={q.level} />
                    <LangBadge lang={q.language} />
                    <Menu
                      trigger={
                        <button className="icon-btn" style={{ width: 32, height: 32, border: 'none', background: 'transparent' }} aria-label="menu">
                          <Icon name="drag" size={17} />
                        </button>
                      }
                      items={[
                        { label: t('quizzes.playCta'), icon: 'play', onClick: () => navigate(`/quizzes/${q.id}/play`) },
                        ...(canEdit
                          ? [
                              { label: t('quizzes.editCta'), icon: 'edit', onClick: () => navigate(`/quizzes/${q.id}/edit`) },
                              'divider',
                              { label: t('common.delete'), icon: 'trash', danger: true, onClick: () => setToDelete(q) },
                            ]
                          : []),
                      ]}
                    />
                  </div>
                </div>

                {q.description && <p className="quiz-desc">{q.description}</p>}

                <div className="quiz-meta">
                  {q.aiGenerated && <Badge color="brand" icon={<Icon name="sparkles" size={12} />}>{t('quizzes.aiBadge')}</Badge>}
                  {!q.isPublished && <Badge color="amber">{t('quizzes.draftBadge')}</Badge>}
                  {isProfessor && q.attemptCount > 0 && <Badge color="green">{q.attemptCount} {t('quizzes.attemptsCount')}</Badge>}
                </div>

                <div className="quiz-foot">
                  <span className="row" style={{ gap: 5 }}><Icon name="quiz" size={14} />{q.questionCount} {t('quizzes.questionsCount')}</span>
                  <span className="row" style={{ gap: 5 }}><Icon name="clock" size={14} />{q.durationMinutes} {t('common.minutes')}</span>
                  <span className="spacer" />
                  <Link to={`/quizzes/${q.id}/play`} className="btn btn-secondary btn-sm">
                    <Icon name="play" size={14} />
                    {t('quizzes.playCta')}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        busy={deleting}
        title={t('quizzes.deleteTitle')}
        message={t('quizzes.deleteMsg', { title: toDelete?.title || '' })}
        confirmLabel={t('common.delete')}
      />
    </div>
  );
}
