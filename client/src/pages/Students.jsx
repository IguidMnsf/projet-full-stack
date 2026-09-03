import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useI18n } from '../i18n/index.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { Icon } from '../components/Icon.jsx';
import { Avatar, Badge, EmptyState, LevelBadge, PageLoading, RowSkeleton } from '../components/ui.jsx';

export default function Students() {
  const { t, fmtDate } = useI18n();
  const { user } = useAuth();
  const [rows, setRows] = useState(null);

  useEffect(() => {
    let alive = true;
    api('/users')
      .then((data) => alive && setRows(data))
      .catch(() => alive && setRows([]));
    return () => { alive = false; };
  }, []);

  if (rows === null) return <PageLoading />;

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>{t('students.title')}</h2>
          <p>{t('students.subtitle')}</p>
        </div>
        <Badge color="brand" icon={<Icon name="students" size={13} />}>{rows.length}</Badge>
      </div>

      <div className="card fade-up">
        {rows.length === 0 ? (
          <EmptyState icon="students" title={t('students.empty')} />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>{t('students.colName')}</th>
                  <th>{t('auth.role')}</th>
                  <th>{t('students.colLevel')}</th>
                  <th>{t('students.colAttempts')}</th>
                  <th>{t('students.colAvg')}</th>
                  <th>{t('students.colJoined')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id} style={s.id === user.id ? { background: 'var(--brand-soft)' } : undefined}>
                    <td>
                      <span className="row" style={{ gap: 10 }}>
                        <Avatar name={s.name} color={s.avatarColor} size={32} />
                        <span>
                          <span className="cell-strong" style={{ display: 'block' }}>{s.name}</span>
                          <span className="cell-muted">{s.email}</span>
                        </span>
                      </span>
                    </td>
                    <td><Badge color={s.role === 'student' ? 'gray' : 'brand'}>{t(`roles.${s.role}`)}</Badge></td>
                    <td><LevelBadge level={s.academicLevel} /></td>
                    <td className="cell-strong">{s.attemptCount}</td>
                    <td>
                      {s.avgScore !== null ? (
                        <span className={`score-pill ${s.avgScore >= 70 ? 'good' : s.avgScore >= 50 ? 'mid' : 'bad'}`}>{s.avgScore}%</span>
                      ) : (
                        <span className="cell-muted">—</span>
                      )}
                    </td>
                    <td className="cell-muted">{fmtDate(s.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
