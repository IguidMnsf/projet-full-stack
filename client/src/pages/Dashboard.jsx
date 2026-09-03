import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useI18n } from '../i18n/index.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { Icon } from '../components/Icon.jsx';
import { ActivityChart, Avatar, Badge, EmptyState, LevelBadge, PageLoading, QuizCardSkeleton, ScorePill, Skeleton } from '../components/ui.jsx';

function StatCard({ icon, label, value, tone = 'brand', foot }) {
  const tones = {
    brand: { background: 'var(--brand-soft)', color: 'var(--brand)' },
    green: { background: 'var(--green-soft)', color: 'var(--green)' },
    amber: { background: 'var(--amber-soft)', color: 'var(--amber)' },
    blue: { background: 'var(--blue-soft)', color: 'var(--blue)' },
    pink: { background: '#fdf2f8', color: '#db2777' },
  };
  return (
    <div className="card stat-card fade-up">
      <span className="stat-icon" style={tones[tone]}>
        <Icon name={icon} size={22} />
      </span>
      <div style={{ minWidth: 0 }}>
        <div className="stat-value">{value ?? '—'}</div>
        <div className="stat-label">{label}</div>
        {foot && <div className={`stat-trend ${foot.dir || ''}`}>{foot.text}</div>}
      </div>
    </div>
  );
}

function greetingKey() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

const SUBJECT_TONES = {
  informatique: ['brand', 'quiz'],
  'computer science': ['brand', 'quiz'],
  'الإعلام الآلي': ['brand', 'quiz'],
  mathématiques: ['blue', 'scores'],
  mathematics: ['blue', 'scores'],
  الرياضيات: ['blue', 'scores'],
  physique: ['amber', 'zap'],
  physics: ['amber', 'zap'],
  الفيزياء: ['amber', 'zap'],
  biology: ['green', 'book'],
  biologie: ['green', 'book'],
  economics: ['pink', 'scores'],
};

export default function Dashboard() {
  const { t, timeAgo } = useI18n();
  const { user, isProfessor } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    api('/dashboard')
      .then((d) => alive && setData(d))
      .catch(() => alive && setError(true));
    return () => { alive = false; };
  }, [user?.id]);

  if (error) {
    return <EmptyState icon="alertCircle" title={t('toast.serverError')} sub={t('toast.networkError')} action={t('common.retry')} onAction={() => window.location.reload()} />;
  }
  if (!data) {
    return (
      <div className="grid" style={{ gap: 18 }}>
        <div className="grid grid-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="card stat-card"><Skeleton w={46} h={46} radius={13} /><div style={{ flex: 1 }}><Skeleton w="60%" h={22} /><Skeleton w="80%" h={12} style={{ marginTop: 6 }} /></div></div>
          ))}
        </div>
        <div className="grid grid-2">
          {[0, 1, 2, 3].map((i) => <QuizCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  const { totals, me, recommended, recentAttempts, activity, leaderboard, subjects } = data;
  const firstName = (user?.name || "").split(' ').slice(0, 2).join(' ');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* Greeting */}
      <div className="fade-up">
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>
          {t(`dashboard.${greetingKey()}`)}, {firstName} <span style={{ fontSize: 20 }}>👋</span>
        </h2>
        <p className="muted" style={{ margin: '3px 0 0' }}>{t('dashboard.welcomeSub')}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-4">
        <StatCard icon="quiz" tone="brand" label={t('dashboard.statQuizzes')} value={totals.totalQuizzes} />
        {isProfessor ? (
          <StatCard icon="students" tone="blue" label={t('dashboard.statTotalAttempts')} value={totals.totalAttempts} />
        ) : (
          <StatCard icon="play" tone="blue" label={t('dashboard.statAttempts')} value={me.attempts} />
        )}
        <StatCard icon="target" tone="green" label={t('dashboard.statAvg')} value={me.avgScore !== null ? `${me.avgScore}%` : '—'} />
        <StatCard icon="trophy" tone="amber" label={t('dashboard.statBest')} value={me.bestScore !== null ? `${me.bestScore}%` : '—'} />
      </div>

      {/* Recommended */}
      <section className="fade-up">
        <div className="row-wrap mb-2" style={{ justifyContent: 'space-between' }}>
          <div>
            <h3 className="section-title">{t('dashboard.recommended')}</h3>
            <p className="muted small" style={{ margin: 0 }}>{t('dashboard.recommendedSub')}</p>
          </div>
          <Link to="/quizzes" className="btn btn-secondary btn-sm">
            {t('common.seeAll')}
            <Icon name="chevronRight" size={15} className="flip-x" />
          </Link>
        </div>
        {recommended.length === 0 ? (
          <div className="card">
            <EmptyState
              icon="quiz"
              title={t('dashboard.emptyQuizzes')}
              action={t('quizzes.createFirst')}
              actionIcon="plus"
              onAction={() => navigate('/quizzes/new')}
            />
          </div>
        ) : (
          <div className="grid grid-2">
            {recommended.map((q) => {
              const tone = SUBJECT_TONES[q.subject?.toLowerCase()] || ['brand', 'book'];
              return (
                <div key={q.id} className="card quiz-card">
                  <div className="quiz-top">
                    <div className="row" style={{ minWidth: 0 }}>
                      <span className="subject-icon" style={{ background: tone[0] === 'brand' ? 'var(--brand-soft)' : tone[0] === 'blue' ? 'var(--blue-soft)' : tone[0] === 'amber' ? 'var(--amber-soft)' : tone[0] === 'green' ? 'var(--green-soft)' : '#fdf2f8', color: tone[0] === 'brand' ? 'var(--brand)' : tone[0] === 'blue' ? 'var(--blue)' : tone[0] === 'amber' ? 'var(--amber)' : tone[0] === 'green' ? 'var(--green)' : '#db2777' }}>
                        <Icon name={tone[1]} size={19} />
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <h3><Link to={`/quizzes/${q.id}/play`}>{q.title}</Link></h3>
                        <span className="small muted">{q.subject} · {t('common.by')} {q.ownerName}</span>
                      </div>
                    </div>
                    <div className="row" style={{ gap: 6, flexShrink: 0 }}>
                      <LevelBadge level={q.level} />
                      {q.aiGenerated && <Badge color="brand" icon={<Icon name="sparkles" size={12} />}>{t('quizzes.aiBadge')}</Badge>}
                    </div>
                  </div>
                  {q.description && <p className="quiz-desc">{q.description}</p>}
                  <div className="quiz-foot">
                    <span className="row" style={{ gap: 5 }}><Icon name="quiz" size={14} />{q.questionCount} {t('common.questions')}</span>
                    <span className="row" style={{ gap: 5 }}><Icon name="clock" size={14} />{q.durationMinutes} {t('common.minutes')}</span>
                    <span className="row" style={{ gap: 5 }}><Icon name="play" size={13} />{q.attemptCount}</span>
                    <span className="spacer" />
                    <Link to={`/quizzes/${q.id}/play`} className="btn btn-primary btn-sm">
                      <Icon name="play" size={14} />
                      {t('dashboard.startQuiz')}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Activity + side panel */}
      <div className="grid grid-main">
        <section className="card card-pad fade-up">
          <div className="card-head">
            <h3 className="card-title">{t('dashboard.activityChart')}</h3>
            <Badge color="gray">{isProfessor ? t('dashboard.statTotalAttempts') : t('dashboard.statAttempts')}</Badge>
          </div>
          <ActivityChart data={activity} labelAttempts={t('dashboard.activityAttempts')} labelAvg={t('dashboard.activityAvg')} />

          <hr className="divider" />
          <h3 className="card-title mb-2">{isProfessor ? t('dashboard.recentActivityAll') : t('dashboard.recentActivity')}</h3>
          {recentAttempts.length === 0 ? (
            <p className="muted small" style={{ margin: '6px 0' }}>{t('dashboard.emptyAttempts')}</p>
          ) : (
            <div>
              {recentAttempts.map((a) => (
                <div key={a.id} className="row" style={{ padding: '9px 2px', borderBottom: '1px solid var(--line)', gap: 12 }}>
                  <Avatar name={a.userName} color={a.userColor} size={32} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="cell-strong" style={{ fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.quizTitle}</div>
                    <div className="cell-muted">{isProfessor ? a.userName + ' · ' : ''}{timeAgo(a.createdAt)} · {Math.round(a.durationSeconds / 60)} {t('common.minutes')}</div>
                  </div>
                  <ScorePill percentage={a.percentage} />
                </div>
              ))}
              <Link to="/scores" className="btn btn-ghost btn-sm mt-2">
                {t('common.seeAll')} <Icon name="chevronRight" size={14} className="flip-x" />
              </Link>
            </div>
          )}
        </section>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <section className="card card-pad fade-up">
            <div className="card-head" style={{ marginBottom: 8 }}>
              <h3 className="card-title">{t('dashboard.leaderboard')}</h3>
              <Badge color="amber" icon={<Icon name="trophy" size={12} />}>{t('dashboard.leaderboardSub')}</Badge>
            </div>
            {leaderboard.length === 0 ? (
              <p className="muted small">{t('dashboard.noData')}</p>
            ) : (
              leaderboard.map((u, i) => (
                <div key={u.userId} className="lb-row">
                  <span className={`lb-rank r${i + 1}`}>{i + 1}</span>
                  <Avatar name={u.name} color={u.color} size={30} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="cell-strong" style={{ fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</div>
                    <div className="cell-muted">{u.attempts} {t('dashboard.activityAttempts')}</div>
                  </div>
                  <span className="score-pill good" style={{ background: 'transparent', paddingInline: 0 }}>{u.avgScore}%</span>
                </div>
              ))
            )}
          </section>

          {subjects.length > 0 && (
            <section className="card card-pad fade-up">
              <h3 className="card-title mb-2">{t('dashboard.activityAttempts')} · {t('quizzes.allSubjects')}</h3>
              {subjects.map((s) => {
                const max = Math.max(...subjects.map((x) => x.count));
                return (
                  <div key={s.subject} style={{ marginBottom: 10 }}>
                    <div className="row" style={{ justifyContent: 'space-between', fontSize: 12.8, marginBottom: 4 }}>
                      <span className="strong" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>{s.subject}</span>
                      <span className="muted">{s.count}</span>
                    </div>
                    <div className="progress thin"><span style={{ width: `${(s.count / max) * 100}%` }} /></div>
                  </div>
                );
              })}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
