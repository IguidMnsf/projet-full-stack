import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { useI18n } from '../i18n/index.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Icon } from '../components/Icon.jsx';
import { Badge, EmptyState, LevelBadge, Modal, PageLoading, ScoreRing, Spinner } from '../components/ui.jsx';

const fmtDuration = (s) => `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;

export default function QuizPlayer() {
  const { id } = useParams();
  const { t, fmtDate } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [current, setCurrent] = useState(0);
  const [selections, setSelections] = useState({}); // questionId -> answerId
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [showReview, setShowReview] = useState(true);

  const startedAt = useRef(Date.now());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setQuiz(null);
    setResult(null);
    setSelections({});
    setCurrent(0);
    startedAt.current = Date.now();
    api(`/quizzes/${id}/full`)
      .then((data) => alive && setQuiz(data))
      .catch((err) => {
        if (!alive) return;
        if (err.status === 403 || err.status === 404) setNotFound(true);
        else toast.error(t('toast.serverError'));
      })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Timer while playing
  useEffect(() => {
    if (result || loading || !quiz) return undefined;
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [result, loading, quiz]);

  const questions = useMemo(() => quiz?.questions || [], [quiz]);
  const answeredCount = Object.keys(selections).length;
  const total = questions.length;
  const q = questions[current];

  const select = (answerId) => {
    if (result) return;
    setSelections((s) => ({ ...s, [q.id]: answerId }));
  };

  const submit = async () => {
    setConfirmOpen(false);
    setSubmitting(true);
    try {
      const payload = {
        answers: Object.entries(selections).map(([questionId, answerId]) => ({ questionId: Number(questionId), answerId })),
        durationSeconds: Math.max(1, Math.floor((Date.now() - startedAt.current) / 1000)),
      };
      const data = await api(`/quizzes/${id}/attempts`, { method: 'POST', body: payload });
      setResult(data);
      toast.success(t('player.newAttemptSaved'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      toast.error(err.status === 0 ? t('toast.networkError') : err.message || t('toast.serverError'));
    } finally {
      setSubmitting(false);
    }
  };

  const retake = () => {
    setResult(null);
    setSelections({});
    setCurrent(0);
    setElapsed(0);
    startedAt.current = Date.now();
    window.scrollTo({ top: 0 });
  };

  if (loading) return <PageLoading />;
  if (notFound || !quiz) {
    return (
      <div className="card">
        <EmptyState icon="alertCircle" title="404" sub={t('errors.generic')} action={t('player.backCta')} onAction={() => navigate('/quizzes')} />
      </div>
    );
  }
  if (total === 0) {
    return (
      <div className="card">
        <EmptyState icon="quiz" title={t('player.emptyQuiz')} action={t('player.backCta')} actionIcon="chevronLeft" onAction={() => navigate('/quizzes')} />
      </div>
    );
  }

  /* ------------------------------ result view ----------------------------- */
  if (result) {
    const passed = result.percentage >= 50;
    const great = result.percentage >= 80;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 780, margin: '0 auto' }}>
        <div className="card score-hero fade-up">
          <div className="row" style={{ justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
            <LevelBadge level={quiz.level} />
            {quiz.aiGenerated && <Badge color="brand" icon={<Icon name="sparkles" size={12} />}>{t('quizzes.aiBadge')}</Badge>}
          </div>
          <h2 style={{ margin: '10px 0 2px', fontSize: 20, fontWeight: 800 }}>{quiz.title}</h2>
          <p className="muted" style={{ margin: 0 }}>{t('player.yourScore')}</p>

          <ScoreRing percentage={result.percentage} />

          <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: result.percentage >= 70 ? 'var(--green)' : result.percentage >= 50 ? 'var(--amber)' : 'var(--red)' }}>
            {great ? t('player.passed') : passed ? t('player.almost') : t('player.failed')}
          </h3>
          <p className="muted" style={{ margin: '0 0 14px' }}>
            {t('player.correctCount', { n: result.score, total: result.total })} · {t('player.timeTaken')} {fmtDuration(result.durationSeconds)}
          </p>

          <div className="row" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={() => setShowReview((s) => !s)}>
              <Icon name="eye" size={16} />
              {showReview ? t('scores.reviewAnswers') : t('player.reviewCta')}
            </button>
            <button className="btn btn-primary" onClick={retake}>
              <Icon name="refresh" size={16} />
              {t('player.retakeCta')}
            </button>
            <Link to="/quizzes" className="btn btn-secondary">
              {t('player.backCta')}
            </Link>
          </div>
        </div>

        {showReview && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h3 className="section-title" style={{ margin: 0 }}>{t('player.reviewTitle')}</h3>
            {result.breakdown.map((b, i) => (
              <div key={b.questionId} className="card player-q fade-up" style={{ padding: 20 }}>
                <div className="row" style={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <span className="badge badge-gray">{t('editor.questionCard', { n: i + 1 })}</span>
                  <Badge color={b.correct ? 'green' : 'red'} icon={<Icon name={b.correct ? 'checkCircle' : 'xCircle'} size={12} />}>
                    {b.correct ? '✓' : '✗'}
                  </Badge>
                </div>
                <p className="q-text" style={{ fontSize: 15.5 }}>{b.text}</p>
                <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
                  {b.answers.map((a) => {
                    const isSel = a.id === b.selectedAnswerId;
                    const isCorr = a.id === b.correctAnswerId;
                    return (
                      <div key={a.id} className={`option ${isCorr ? 'correct' : ''} ${isSel && !isCorr ? 'wrong' : ''}`} style={{ cursor: 'default' }}>
                        <span className="opt-key">
                          {isCorr ? <Icon name="check" size={14} /> : isSel ? <Icon name="x" size={14} /> : String.fromCharCode(65 + b.answers.indexOf(a))}
                        </span>
                        <span style={{ flex: 1 }}>
                          {a.text}
                          {isSel && <span className="small strong" style={{ color: isCorr ? 'var(--green)' : 'var(--red)' }}> · {t('player.yourAnswer')}</span>}
                          {isCorr && !isSel && <span className="small strong" style={{ color: 'var(--green)' }}> · {t('player.correctAnswer')}</span>}
                        </span>
                      </div>
                    );
                  })}
                  {!b.selectedAnswerId && <span className="small muted">— {t('player.noAnswer')} —</span>}
                </div>
                {b.explanation && (
                  <div className="explanation-box">
                    <b>{t('player.explanation')} — </b>
                    {b.explanation}
                  </div>
                )}
              </div>
            ))}
          </section>
        )}
      </div>
    );
  }

  /* ------------------------------- play view ------------------------------ */
  const pctTime = quiz.durationMinutes > 0 ? Math.min(100, (elapsed / (quiz.durationMinutes * 60)) * 100) : 0;
  const timeUp = pctTime >= 100;

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="card card-pad fade-up">
        <div className="player-head">
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="row" style={{ gap: 7, flexWrap: 'wrap' }}>
              <LevelBadge level={quiz.level} />
              {quiz.aiGenerated && <Badge color="brand" icon={<Icon name="sparkles" size={12} />}>{t('quizzes.aiBadge')}</Badge>}
              {quiz.description && <span className="small muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{quiz.subject}</span>}
            </div>
            <h2 style={{ margin: '6px 0 0', fontSize: 19, fontWeight: 800, letterSpacing: '-0.02em' }}>{quiz.title}</h2>
          </div>
          <span className={`timer ${pctTime > 80 ? 'warn' : ''}`}>
            <Icon name="clock" size={16} />
            {fmtDuration(elapsed)} / {quiz.durationMinutes}:00
          </span>
        </div>
        <div className="progress mt-2">
          <span style={{ width: `${(answeredCount / total) * 100}%` }} />
        </div>
        <div className="row mt-1" style={{ justifyContent: 'space-between' }}>
          <span className="small muted">{t('player.questionOf', { i: current + 1, n: total })} · {answeredCount}/{total}</span>
          <span className="small muted">{t('player.instructions')}</span>
        </div>
      </div>

      <div className="player-grid">
        <div className="card player-q fade-up" key={q.id} dir="auto">
          <span className="badge badge-brand mb-1">{t('player.questionOf', { i: current + 1, n: total })}</span>
          <p className="q-text">{q.text}</p>
          <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
            {q.answers.map((a, i) => (
              <label key={a.id} className={`option ${selections[q.id] === a.id ? 'selected' : ''}`}>
                <input type="radio" name={`q-${q.id}`} checked={selections[q.id] === a.id} onChange={() => select(a.id)} />
                <span className="opt-key">{String.fromCharCode(65 + i)}</span>
                <span>{a.text}</span>
              </label>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card card-pad" style={{ padding: 14 }} dir="auto">
            <div className="small strong mb-1">{t('editor.questionsCard')}</div>
            <div className="q-nav" dir="ltr">              {questions.map((qq, i) => (
                <button
                  key={qq.id}
                  className={`q-dot ${selections[qq.id] ? 'answered' : ''} ${i === current ? 'current' : ''}`}
                  onClick={() => setCurrent(i)}
                  aria-label={i + 1}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
          <button className="btn btn-primary btn-block" disabled={submitting} onClick={() => setConfirmOpen(true)}>
            {submitting ? <Spinner size="white" /> : <Icon name="checkCircle" size={16} />}
            {t('player.submit')}
          </button>
          {current > 0 && (
            <button className="btn btn-secondary btn-block" onClick={() => setCurrent((c) => c - 1)}>
              <Icon name="chevronLeft" size={15} />
              {t('common.previous')}
            </button>
          )}
          {current < total - 1 && (
            <button className="btn btn-secondary btn-block" onClick={() => setCurrent((c) => c + 1)}>
              {t('common.next')}
              <Icon name="chevronRight" size={15} />
            </button>
          )}
        </div>
      </div>
      {timeUp && (
        <div className="form-error" style={{ margin: 0 }}>
          <Icon name="clock" size={16} />
          {t('player.timeLimit')} — {t('player.submit')}
        </div>
      )}

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={t('player.confirmTitle')}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setConfirmOpen(false)}>{t('common.cancel')}</button>
            <button className="btn btn-primary" onClick={submit} disabled={submitting}>
              {submitting && <Spinner size="white" />}
              {t('player.submit')}
            </button>
          </>
        }
      >
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          {t('player.confirmMsg', { a: answeredCount, n: total })}
          {answeredCount < total && <span className="strong" style={{ color: 'var(--amber)' }}> ({total - answeredCount} {t('player.unanswered')})</span>}
        </p>
      </Modal>
    </div>
  );
}
