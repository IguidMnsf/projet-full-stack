import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { aiHeaders } from '../api/aiKey.js';
import { useI18n } from '../i18n/index.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { Icon } from '../components/Icon.jsx';
import { Badge, ConfirmDialog, EmptyState, Field, Modal, PageLoading, Spinner } from '../components/ui.jsx';

const LEVELS = ['L1', 'L2', 'L3', 'M1', 'M2'];
const LANGS = ['fr', 'en', 'ar'];

const emptyQuestion = () => ({
  text: '',
  explanation: '',
  answers: [
    { text: '', isCorrect: true },
    { text: '', isCorrect: false },
  ],
});

/* ------------------------------ question modal ---------------------------- */

function QuestionModal({ open, onClose, onSave, initial, busy, mode }) {
  const { t } = useI18n();
  const [q, setQ] = useState(initial);
  const [error, setError] = useState('');

  useEffect(() => {
    setQ(initial);
    setError('');
  }, [initial, open]);

  const setAnswer = (i, patch) => {
    setQ((cur) => {
      const answers = cur.answers.map((a, idx) => (idx === i ? { ...a, ...patch } : a));
      return { ...cur, answers };
    });
  };

  const markCorrect = (i) => {
    setQ((cur) => ({ ...cur, answers: cur.answers.map((a, idx) => ({ ...a, isCorrect: idx === i })) }));
  };

  const addAnswer = () => {
    setQ((cur) => (cur.answers.length >= 6 ? cur : { ...cur, answers: [...cur.answers, { text: '', isCorrect: false }] }));
  };

  const removeAnswer = (i) => {
    setQ((cur) => {
      if (cur.answers.length <= 2) return cur;
      let answers = cur.answers.filter((_, idx) => idx !== i);
      if (!answers.some((a) => a.isCorrect)) answers = answers.map((a, idx) => (idx === 0 ? { ...a, isCorrect: true } : a));
      return { ...cur, answers };
    });
  };

  const submit = () => {
    if (!q.text.trim() || q.answers.some((a) => !a.text.trim()) || !q.answers.some((a) => a.isCorrect)) {
      setError(t('editor.needTwoAnswers'));
      return;
    }
    onSave({
      text: q.text.trim(),
      explanation: q.explanation.trim() || null,
      answers: q.answers.map((a) => ({ text: a.text.trim(), isCorrect: a.isCorrect })),
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'edit' ? t('editor.editQuestionTitle') : t('editor.addQuestion')}
      size="lg"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={busy}>{t('common.cancel')}</button>
          <button className="btn btn-primary" onClick={submit} disabled={busy}>
            {busy && <Spinner size="white" />}
            <Icon name="check" size={16} />
            {mode === 'edit' ? t('editor.updateQuestion') : t('editor.saveQuestion')}
          </button>
        </>
      }
    >
      {error && <div className="form-error"><Icon name="alertCircle" size={16} />{error}</div>}

      <Field label={t('editor.questionTextLabel')}>
        <textarea
          className="textarea"
          rows={2}
          placeholder={t('editor.questionTextPlaceholder')}
          value={q.text}
          onChange={(e) => setQ((c) => ({ ...c, text: e.target.value }))}
          autoFocus
        />
      </Field>

          <Field label={t('editor.answersLabel')} hint={t('editor.correctHelper')}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {q.answers.map((a, i) => (
                <div key={i} className="row" style={{ gap: 9 }}>
                  <div
                    className={`option ${a.isCorrect ? 'correct' : ''}`}
                    style={{ flex: 1, padding: '9px 12px' }}
                    onClick={() => markCorrect(i)}
                    title={t('editor.correctHelper')}
                    role="radio"
                    aria-checked={a.isCorrect}
                    tabIndex={0}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && markCorrect(i)}
                  >
                    <span className="opt-key" style={{ width: 22, height: 22 }}>{a.isCorrect ? <Icon name="check" size={13} /> : String.fromCharCode(65 + i)}</span>
                    <input
                      className="input"
                      style={{ border: 'none', boxShadow: 'none', padding: 0, background: 'transparent', flex: 1 }}
                      placeholder={`${t('common.question')} ${String.fromCharCode(65 + i)}`}
                      value={a.text}
                      onChange={(e) => setAnswer(i, { text: e.target.value })}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
              <button type="button" className="icon-btn danger" style={{ width: 34, height: 34 }} onClick={() => removeAnswer(i)} disabled={q.answers.length <= 2} aria-label="remove answer">
                <Icon name="x" size={15} />
              </button>
            </div>
          ))}
        </div>
      </Field>

      <button type="button" className="btn btn-secondary btn-sm" onClick={addAnswer} disabled={q.answers.length >= 6}>
        <Icon name="plus" size={15} />
        {t('editor.addAnswer')}
      </button>

      <Field label={`${t('editor.explanationLabel')} (${t('common.optional')})`}>
        <textarea
          className="textarea"
          rows={2}
          placeholder={t('editor.explanationPlaceholder')}
          value={q.explanation}
          onChange={(e) => setQ((c) => ({ ...c, explanation: e.target.value }))}
        />
      </Field>
    </Modal>
  );
}

/* -------------------------------- AI modal -------------------------------- */

function AiModal({ open, onClose, quiz, onImported }) {
  const { t } = useI18n();
  const toast = useToast();
  const [text, setText] = useState('');
  const [count, setCount] = useState(5);
  const [language, setLanguage] = useState(quiz?.language || 'fr');
  const [busy, setBusy] = useState(false);
  const [generated, setGenerated] = useState(null);
  const [notice, setNotice] = useState(null);
  const [selected, setSelected] = useState({});
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (open) {
      setGenerated(null);
      setNotice(null);
      setSelected({});
      setLanguage(quiz?.language || 'fr');
    }
  }, [open, quiz?.language]);

  useEffect(() => {
    if (generated) {
      setSelected(Object.fromEntries(generated.questions.map((_, i) => [i, true])));
    }
  }, [generated]);

  const generate = async () => {
    if (text.trim().length < 200) {
      toast.error(t('editor.minChars'));
      return;
    }
    setBusy(true);
    setGenerated(null);
    try {
      const data = await api('/ai/generate', {
        method: 'POST',
        body: { text: text.trim(), count, language, level: quiz?.level || 'L2', subject: quiz?.subject || '' },
        extraHeaders: aiHeaders(),
      });
      setGenerated(data);
      setNotice(data.notice);
      if (!data.questions?.length) toast.error(t('editor.aiEmpty'));
    } catch (err) {
      toast.error(err.status === 0 ? t('toast.networkError') : err.message || t('toast.serverError'));
    } finally {
      setBusy(false);
    }
  };

  const importSelected = async () => {
    const picked = generated.questions.filter((_, i) => selected[i]);
    if (!picked.length) return;
    setImporting(true);
    try {
      const created = await api(`/quizzes/${quiz.id}/questions/bulk`, {
        method: 'POST',
        body: { questions: picked, markAiGenerated: true, aiProvider: generated.provider },
        extraHeaders: aiHeaders(),
      });
      toast.success(t('editor.aiImportedToast', { n: created.length }));
      onImported(created);
      onClose();
    } catch (err) {
      toast.error(err.status === 0 ? t('toast.networkError') : err.message || t('toast.serverError'));
    } finally {
      setImporting(false);
    }
  };

  const selectedCount = generated ? Object.values(selected).filter(Boolean).length : 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('editor.aiModalTitle')}
      size="lg"
      footer={
        generated ? (
          <>
            <button className="btn btn-secondary" onClick={() => { setGenerated(null); setNotice(null); }} disabled={importing}>
              <Icon name="refresh" size={15} />
              {t('common.back')}
            </button>
            <button className="btn btn-primary" onClick={importSelected} disabled={importing || selectedCount === 0}>
              {importing ? <Spinner size="white" /> : <Icon name="sparkles" size={16} />}
              {t('editor.aiUseAll', { n: selectedCount })}
            </button>
          </>
        ) : (
          <>
            <button className="btn btn-secondary" onClick={onClose} disabled={busy}>{t('common.cancel')}</button>
            <button className="btn btn-primary" onClick={generate} disabled={busy}>
              {busy ? <Spinner size="white" /> : <Icon name="sparkles" size={16} />}
              {busy ? t('editor.aiGenerating') : t('editor.aiGenerateBtn')}
            </button>
          </>
        )
      }
    >
      <p className="muted small" style={{ marginTop: 0 }}>{t('editor.aiModalSub')}</p>

      {notice && (
        <div className="form-error" style={{ background: 'var(--amber-soft)', borderColor: '#fde68a', color: '#92400e' }}>
          <Icon name="info" size={16} />
          {notice.startsWith('gemini') || notice.startsWith('openai') ? t('editor.aiFallbackNotice') : t('editor.aiLocalNotice')}
        </div>
      )}

      {!generated ? (
        <>
          <Field label={t('editor.aiSourceLabel')}>
            <textarea
              className="textarea"
              rows={7}
              placeholder={t('editor.aiSourcePlaceholder')}
              value={text}
              onChange={(e) => setText(e.target.value)}
              style={{ minHeight: 140 }}
              autoFocus
            />
            <span className="hint">{t('editor.charCount', { n: text.trim().length })}</span>
          </Field>
          <div className="form-row">
            <Field label={t('editor.aiCountLabel')}>
              <select className="select" value={count} onChange={(e) => setCount(Number(e.target.value))}>
                {[3, 4, 5, 6, 8, 10].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </Field>
            <Field label={t('editor.aiLangLabel')}>
              <select className="select" value={language} onChange={(e) => setLanguage(e.target.value)}>
                {LANGS.map((l) => (
                  <option key={l} value={l}>{t(`lang.${l}`)}</option>
                ))}
              </select>
            </Field>
          </div>
        </>
      ) : (
        <>
          <div className="row mb-2" style={{ justifyContent: 'space-between' }}>
            <strong>{t('editor.aiReviewTitle')}</strong>
            <Badge color="brand" icon={<Icon name="sparkles" size={12} />}>{generated.provider}</Badge>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {generated.questions.map((q, i) => (
              <div key={i} className="card" style={{ padding: 14, boxShadow: 'none', background: selected[i] === false ? '#fafbfc' : '#fff' }}>
                <label className="row" style={{ alignItems: 'flex-start', cursor: 'pointer', gap: 10 }}>
                  <input
                    type="checkbox"
                    checked={selected[i] !== false}
                    onChange={(e) => setSelected((s) => ({ ...s, [i]: e.target.checked }))}
                    style={{ marginTop: 4, width: 16, height: 16, accentColor: 'var(--brand)' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div className="strong" style={{ lineHeight: 1.5 }}>
                      {i + 1}. {q.text}
                    </div>
                    <div style={{ display: 'grid', gap: 4, marginTop: 8 }}>
                      {q.answers.map((a, j) => (
                        <div key={j} className="row" style={{ gap: 7, fontSize: 13.3 }}>
                          <Icon name={a.isCorrect ? 'checkCircle' : 'x'} size={14} style={{ color: a.isCorrect ? 'var(--green)' : 'var(--faint)', flexShrink: 0 }} />
                          <span style={{ color: a.isCorrect ? 'var(--green)' : 'var(--muted)', fontWeight: a.isCorrect ? 700 : 500 }}>{a.text}</span>
                        </div>
                      ))}
                    </div>
                    {q.explanation && <div className="explanation-box" style={{ marginTop: 10 }}>{q.explanation}</div>}
                  </div>
                </label>
              </div>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
}

/* ------------------------------- main editor ------------------------------ */

export default function QuizEditor({ mode }) {
  const { t } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();
  const { id } = useParams();
  const quizId = mode === 'edit' ? Number(id) : null;

  const [quiz, setQuiz] = useState(mode === 'create' ? { title: '', description: '', subject: '', level: 'L1', language: 'fr', durationMinutes: 15, isPublished: true } : null);
  const [questions, setQuestions] = useState(null);
  const [loading, setLoading] = useState(mode === 'edit');
  const [notFound, setNotFound] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);
  const [metaSavedOnce, setMetaSavedOnce] = useState(mode === 'edit');  const [qModal, setQModal] = useState(null); // {mode:'add'} | {mode:'edit', question, index}
  const [qBusy, setQBusy] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [delBusy, setDelBusy] = useState(false);
  const [subjects, setSubjects] = useState([]);

  // subject suggestions
  useEffect(() => {
    api('/quizzes?limit=200')
      .then((data) => setSubjects([...new Set(data.map((q) => q.subject).filter(Boolean))]))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!quizId) return;
    let alive = true;
    setLoading(true);
    Promise.all([api(`/quizzes/${quizId}`), api(`/quizzes/${quizId}/full?mode=edit`)])
      .then(([meta, full]) => {
        if (!alive) return;
        setQuiz(meta.data ?? meta);
        setQuestions(full.questions);
        setMetaSavedOnce(true);
      })
      .catch(() => alive && setNotFound(true))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [quizId]);

  const saveMeta = async ({ silent } = {}) => {
    setSavingMeta(true);
    try {
      if (mode === 'create') {
        const created = await api('/quizzes', { method: 'POST', body: { ...quiz, isPublished: quiz.isPublished ? 1 : 0 } });
        toast.success(t('quizzes.createdToast'));
        navigate(`/quizzes/${created.id}/edit`, { replace: true });
      } else {
        const updated = await api(`/quizzes/${quizId}`, { method: 'PUT', body: { ...quiz } });
        setQuiz((q) => ({ ...q, ...updated, isPublished: updated.isPublished }));
        if (!silent) toast.success(t('editor.quizSavedToast'));
        setMetaSavedOnce(true);
      }
      return true;
    } catch (err) {
      toast.error(err.status === 0 ? t('toast.networkError') : err.message || t('toast.serverError'));
      return false;
    } finally {
      setSavingMeta(false);
    }
  };

  const togglePublish = async () => {
    const next = !quiz.isPublished;
    setQuiz((q) => ({ ...q, isPublished: next })); // optimistic
    try {
      await api(`/quizzes/${quizId}`, { method: 'PUT', body: { isPublished: next } });
      toast.success(next ? t('editor.publishedToast') : t('editor.unpublishedToast'));
    } catch (err) {
      setQuiz((q) => ({ ...q, isPublished: !next })); // rollback
      toast.error(err.message || t('toast.serverError'));
    }
  };

  const saveQuestion = async (payload) => {
    setQBusy(true);
    try {
      if (qModal.mode === 'edit') {
        const updated = await api(`/questions/${qModal.question.id}`, { method: 'PUT', body: payload });
        setQuestions((list) => list.map((q) => (q.id === updated.id ? updated : q)));
      } else {
        const created = await api(`/quizzes/${quizId}/questions`, { method: 'POST', body: payload });
        setQuestions((list) => [...(list || []), created]);
      }
      toast.success(t('editor.questionSavedToast'));
      setQModal(null);
    } catch (err) {
      toast.error(err.status === 0 ? t('toast.networkError') : err.message || t('toast.serverError'));
    } finally {
      setQBusy(false);
    }
  };

  /* Optimistic question delete with rollback */
  const confirmDeleteQuestion = async () => {
    const target = toDelete;
    if (!target) return;
    setDelBusy(true);
    const snapshot = questions;
    setQuestions((list) => list.filter((q) => q.id !== target.id));
    setToDelete(null);
    try {
      await api(`/questions/${target.id}`, { method: 'DELETE' });
      toast.success(t('editor.questionDeletedToast'));
    } catch (err) {
      setQuestions(snapshot);
      toast.error(err.message || t('toast.serverError'));
    } finally {
      setDelBusy(false);
    }
  };

  const onAiImported = (created) => {
    setQuestions((list) => [...(list || []), ...created]);
  };

  const questionsCount = questions?.length ?? 0;

  if (notFound) {
    return (
      <div className="card">
        <EmptyState icon="alertCircle" title="404" sub={t('errors.generic')} action={t('editor.backToQuizzes')} onAction={() => navigate('/quizzes')} />
      </div>
    );
  }
  if (loading || !quiz) return <PageLoading />;

  const metaValid = quiz.title.trim().length >= 3 && quiz.subject.trim().length >= 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div>
          <Link to="/quizzes" className="btn btn-secondary btn-sm mb-1">
            <Icon name="chevronLeft" size={15} className="flip-x" />
            {t('editor.backToQuizzes')}
          </Link>
          <h2 style={{ margin: '4px 0 0' }}>{quiz.title || t('editor.newQuizTitle')}</h2>
          <p style={{ margin: 0 }}>
            {mode === 'create' ? t('editor.newQuizSub') : t('editor.editQuizSub')}
            {mode === 'edit' && (
              <span className="row" style={{ gap: 6, display: 'inline-flex', marginInlineStart: 8 }}>
                <Badge color={quiz.isPublished ? 'green' : 'amber'}>{quiz.isPublished ? t('quizzes.publishedBadge') : t('quizzes.draftBadge')}</Badge>
              </span>
            )}
          </p>
        </div>
        {mode === 'edit' && (
          <div className="row">
            {quiz.isPublished && questionsCount > 0 && (
              <Link to={`/quizzes/${quizId}/play`} className="btn btn-secondary">
                <Icon name="eye" size={16} />
                {t('quizzes.playCta')}
              </Link>
            )}
            <button className="btn btn-primary" onClick={() => setQModal({ mode: 'add' })}>
              <Icon name="plus" size={16} />
              {t('editor.addQuestion')}
            </button>
          </div>
        )}
      </div>

      {/* Meta card */}
      <section className="card card-pad fade-up">
        <div className="card-head">
          <div>
            <h3 className="card-title">{t('editor.infoCard')}</h3>
            <p className="muted small" style={{ margin: 0 }}>{t('editor.infoSub')}</p>
          </div>
        </div>

        <div className="form-row">
          <Field label={t('editor.titleLabel')}>
            <input
              className="input"
              placeholder={t('editor.titlePlaceholder')}
              value={quiz.title}
              onChange={(e) => setQuiz((q) => ({ ...q, title: e.target.value }))}
            />
          </Field>
          <Field label={t('editor.subjectLabel')}>
            <input
              className="input"
              list="subject-options"
              placeholder={t('editor.subjectPlaceholder')}
              value={quiz.subject}
              onChange={(e) => setQuiz((q) => ({ ...q, subject: e.target.value }))}
            />
            <datalist id="subject-options">
              {subjects.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </Field>
        </div>

        <Field label={t('editor.descLabel')}>
          <textarea className="textarea" rows={2} placeholder={t('editor.descPlaceholder')} value={quiz.description || ''} onChange={(e) => setQuiz((q) => ({ ...q, description: e.target.value }))} />
        </Field>

        <div className="form-row">
          <Field label={t('editor.levelLabel')}>
            <select className="select" value={quiz.level} onChange={(e) => setQuiz((q) => ({ ...q, level: e.target.value }))}>
              {LEVELS.map((l) => (
                <option key={l} value={l}>{t(`levels.${l}`)}</option>
              ))}
            </select>
          </Field>
          <Field label={t('editor.langLabel')}>
            <select className="select" value={quiz.language} onChange={(e) => setQuiz((q) => ({ ...q, language: e.target.value }))}>
              {LANGS.map((l) => (
                <option key={l} value={l}>{t(`lang.${l}`)}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="form-row">
          <Field label={t('editor.durationLabel')}>
            <input className="input" type="number" min="1" max="180" value={quiz.durationMinutes} onChange={(e) => setQuiz((q) => ({ ...q, durationMinutes: Number(e.target.value) || 15 }))} />
          </Field>
          <Field label={t('editor.publishLabel')} hint={quiz.isPublished ? t('editor.publishedHint') : t('editor.draftHint')}>
            {mode === 'edit' ? (
              <div className="seg" style={{ width: '100%' }} role="group">
                <button type="button" className={!quiz.isPublished ? 'active' : ''} style={{ flex: 1 }} onClick={togglePublish}>{t('quizzes.draftBadge')}</button>
                <button type="button" className={quiz.isPublished ? 'active' : ''} style={{ flex: 1 }} onClick={togglePublish}>{t('quizzes.publishedBadge')}</button>
              </div>
            ) : (
              <label className="row" style={{ cursor: 'pointer', padding: '10px 2px' }}>
                <input type="checkbox" checked={quiz.isPublished} onChange={() => setQuiz((q) => ({ ...q, isPublished: !q.isPublished }))} style={{ width: 17, height: 17, accentColor: 'var(--brand)' }} />
                <span className="strong">{quiz.isPublished ? t('quizzes.publishedBadge') : t('quizzes.draftBadge')}</span>
              </label>
            )}
          </Field>
        </div>

        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={() => saveMeta()} disabled={!metaValid || savingMeta}>
            {savingMeta && <Spinner size="white" />}
            <Icon name="check" size={16} />
            {mode === 'create' ? t('common.create') : t('common.save')}
          </button>
        </div>
      </section>

      {/* Questions section (edit mode only) */}
      {mode === 'edit' && (
        metaSavedOnce ? (
          <section className="card card-pad fade-up">
            <div className="card-head">
              <div>
                <h3 className="card-title">{t('editor.questionsCard')}</h3>
                <p className="muted small" style={{ margin: 0 }}>{t('editor.questionsSub', { count: questionsCount })}</p>
              </div>
              <div className="row">
                <button className="btn btn-secondary" onClick={() => setAiOpen(true)} title={t('editor.aiButtonSub')}>
                  <Icon name="sparkles" size={16} />
                  {t('editor.aiButton')}
                </button>
                <button className="btn btn-primary" onClick={() => setQModal({ mode: 'add' })}>
                  <Icon name="plus" size={16} />
                  {t('editor.addQuestion')}
                </button>
              </div>
            </div>

            {questions === null ? (
              <PageLoading />
            ) : questions.length === 0 ? (
              <EmptyState
                icon="sparkles"
                title={t('editor.emptyQuestionsTitle')}
                sub={t('editor.emptyQuestionsSub')}
                action={t('editor.aiButton')}
                actionIcon="sparkles"
                onAction={() => setAiOpen(true)}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {questions.map((q, i) => (
                  <div key={q.id} className="card fade-up" style={{ padding: 16, boxShadow: 'none', background: '#fbfbfd' }}>
                    <div className="row" style={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ minWidth: 0 }}>
                        <span className="badge badge-gray mb-1">{t('editor.questionCard', { n: i + 1 })}</span>
                        <div className="strong" style={{ lineHeight: 1.5 }}>{q.text}</div>
                      </div>
                      <div className="row" style={{ gap: 4, flexShrink: 0 }}>
                        <button className="icon-btn" style={{ width: 33, height: 33 }} onClick={() => setQModal({ mode: 'edit', question: q })} aria-label={t('common.edit')}>
                          <Icon name="edit" size={15} />
                        </button>
                        <button className="icon-btn danger" style={{ width: 33, height: 33 }} onClick={() => setToDelete(q)} aria-label={t('common.delete')}>
                          <Icon name="trash" size={15} />
                        </button>
                      </div>
                    </div>
                    <div className="row-wrap" style={{ marginTop: 10, gap: 7 }}>
                      {q.answers.map((a, j) => (
                        <span key={a.id} className={`badge ${a.isCorrect ? 'badge-green' : 'badge-gray'}`} style={{ maxWidth: '100%' }}>
                          {a.isCorrect ? <Icon name="check" size={11} /> : null}
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{String.fromCharCode(65 + j)}. {a.text}</span>
                        </span>
                      ))}
                    </div>
                    {q.explanation && <div className="explanation-box mt-2" style={{ padding: '9px 13px' }}>{q.explanation}</div>}
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : null
      )}

      {mode === 'create' && (
        <div className="card">
          <EmptyState
            icon="quiz"
            title={t('editor.emptyQuestionsTitle')}
            sub={t('editor.newQuizSub')}
          />
        </div>
      )}

      {/* Modals */}
      <QuestionModal
        open={Boolean(qModal)}
        mode={qModal?.mode || 'add'}
        initial={qModal?.mode === 'edit' ? { text: qModal.question.text, explanation: qModal.question.explanation || '', answers: qModal.question.answers.map((a) => ({ text: a.text, isCorrect: a.isCorrect })) } : emptyQuestion()}
        busy={qBusy}
        onClose={() => setQModal(null)}
        onSave={saveQuestion}
      />

      <AiModal open={aiOpen} onClose={() => setAiOpen(false)} quiz={quiz} onImported={onAiImported} />

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDeleteQuestion}
        busy={delBusy}
        title={t('editor.deleteQuestionTitle')}
        message={t('editor.deleteQuestionMsg')}
        confirmLabel={t('common.delete')}
      />
    </div>
  );
}
