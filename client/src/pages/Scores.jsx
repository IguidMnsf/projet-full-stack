import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useI18n } from '../i18n/index.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Icon } from '../components/Icon.jsx';
import { Avatar, Badge, ConfirmDialog, EmptyState, Modal, PageLoading, RowSkeleton, ScorePill, Spinner } from '../components/ui.jsx';

export default function Scores() {
  const { t, fmtDate, timeAgo } = useI18n();
  const { user, isProfessor } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [scope, setScope] = useState('mine');
  const [rows, setRows] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [detail, setDetail] = useState(null); // {attempt, loading, data}

  const effectiveScope = isProfessor ? scope : 'mine';

  useEffect(() => {
    let alive = true;
    setRows(null);
    const params = effectiveScope === 'all' ? '?scope=all' : '';
    api(`/scores${params}`)
      .then((data) => alive && setRows(data))
      .catch(() => alive && setRows([]));
    return () => { alive = false; };
  }, [effectiveScope, user?.id]);

  /* optimistic delete with rollback */
  const confirmDelete = async () => {
    const target = toDelete;
    if (!target) return;
    setDeleting(true);
    const snapshot = rows;
    setRows((list) => (list || []).filter((r) => r.id !== target.id));
    setToDelete(null);
    try {
      await api(`/scores/${target.id}`, { method: 'DELETE' });
      toast.success(t('scores.deletedToast'));
    } catch (err) {
      setRows(snapshot);
      toast.error(err.status === 0 ? t('toast.networkError') : err.message || t('toast.permDenied'));
    } finally {
      setDeleting(false);
    }
  };

  const openDetail = async (row) => {
    setDetail({ row, loading: true, data: null });
    try {
      const data = await api(`/scores/${row.id}`);
      setDetail({ row, loading: false, data });
    } catch (err) {
      setDetail(null);
      toast.error(err.status === 403 ? t('toast.permDenied') : t('toast.serverError'));
    }
  };

  const canDelete = (row) => row.userId === user.id || isProfessor;

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>{effectiveScope === 'all' ? t('scores.allTitle') : t('scores.title')}</h2>
          <p>{effectiveScope === 'all' ? t('scores.allSub') : t('scores.subtitle')}</p>
        </div>
        {isProfessor && (
          <div className="seg">
            <button className={effectiveScope === 'mine' ? 'active' : ''} onClick={() => setScope('mine')}>{t('scores.title')}</button>
            <button className={effectiveScope === 'all' ? 'active' : ''} onClick={() => setScope('all')}>{t('scores.allTitle')}</button>
          </div>
        )}
      </div>

      <div className="card fade-up">
        {rows === null ? (
          <div style={{ padding: '6px 18px 14px' }}>
            <RowSkeleton rows={6} />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon="scores"
            title={t('scores.emptyTitle')}
            sub={t('scores.emptySub')}
            action={t('scores.emptyCta')}
            actionIcon="quiz"
            onAction={() => navigate('/quizzes')}
          />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  {effectiveScope === 'all' && <th>{t('scores.colStudent')}</th>}
                  <th>{t('scores.colQuiz')}</th>
                  <th>{t('scores.colScore')}</th>
                  <th>{t('scores.colDuration')}</th>
                  <th>{t('scores.colDate')}</th>
                  <th style={{ textAlign: 'end' }}>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => openDetail(r)}>
                    {effectiveScope === 'all' && (
                      <td>
                        <span className="row" style={{ gap: 9 }}>
                          <Avatar name={r.userName} color={r.userColor} size={30} />
                          <span className="cell-strong">{r.userName}</span>
                        </span>
                      </td>
                    )}
                    <td>
                      <div className="cell-strong">{r.quizTitle}</div>
                      <div className="cell-muted">{r.quizSubject}</div>
                    </td>
                    <td><ScorePill percentage={r.percentage} /></td>
                    <td className="cell-muted">{Math.max(1, Math.round(r.durationSeconds / 60))} {t('common.minutes')}</td>
                    <td className="cell-muted" title={fmtDate(r.createdAt)}>{timeAgo(r.createdAt)}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="row-actions">
                        <button className="icon-btn" style={{ width: 33, height: 33 }} title={t('scores.reviewAnswers')} onClick={() => openDetail(r)}>
                          <Icon name="eye" size={15} />
                        </button>
                        {canDelete(r) && (
                          <button className="icon-btn danger" style={{ width: 33, height: 33 }} title={t('common.delete')} onClick={() => setToDelete(r)}>
                            <Icon name="trash" size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail modal */}
      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={t('scores.detailTitle')}
        size="lg"
      >
        {detail?.loading ? (
          <div style={{ display: 'grid', placeItems: 'center', padding: 40 }}><Spinner size="lg" /></div>
        ) : detail?.data ? (
          <div dir="auto">
            <div className="row-wrap mb-3" style={{ justifyContent: 'space-between' }}>
              <div>
                <div className="strong" style={{ fontSize: 16 }}>{detail.data.quizTitle}</div>
                <div className="cell-muted">
                  {effectiveScope === 'all' && detail.data.userName ? `${detail.data.userName} · ` : ''}
                  {fmtDate(detail.data.createdAt)}
                </div>
              </div>
              <ScorePill percentage={detail.data.percentage} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {detail.data.breakdown.map((b, i) => (
                <div key={b.questionId} className="card" style={{ padding: 14, boxShadow: 'none', background: '#fbfbfd' }}>
                  <div className="row" style={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <span className="badge badge-gray">{t('editor.questionCard', { n: i + 1 })}</span>
                    <Badge color={b.correct ? 'green' : 'red'} icon={<Icon name={b.correct ? 'checkCircle' : 'xCircle'} size={12} />}>
                      {b.correct ? '✓' : '✗'}
                    </Badge>
                  </div>
                  <div className="strong mt-1" style={{ lineHeight: 1.5 }}>{b.text}</div>
                  <div className="row-wrap mt-1" style={{ gap: 6 }}>
                    {b.answers.map((a, j) => {
                      const isSel = a.id === b.selectedAnswerId;
                      const isCorr = a.id === b.correctAnswerId;
                      return (
                        <span key={a.id} className={`badge ${isCorr ? 'badge-green' : isSel ? 'badge-red' : 'badge-gray'}`}>
                          {isCorr ? <Icon name="check" size={11} /> : isSel ? <Icon name="x" size={11} /> : null}
                          {String.fromCharCode(65 + j)}. {a.text}
                        </span>
                      );
                    })}
                  </div>
                  {b.explanation && <div className="explanation-box mt-2" style={{ padding: '9px 13px' }}><b>{t('player.explanation')} — </b>{b.explanation}</div>}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        busy={deleting}
        title={t('scores.deleteTitle')}
        message={t('scores.deleteMsg')}
        confirmLabel={t('common.delete')}
      />
    </div>
  );
}
