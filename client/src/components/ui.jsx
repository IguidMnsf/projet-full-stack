import React, { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon.jsx';
import { useI18n } from '../i18n/index.jsx';

/* ------------------------------- primitives ------------------------------- */

export function Spinner({ size }) {
  return <span className={`spinner ${size === 'lg' ? 'spinner-lg' : ''} ${size === 'white' ? 'white' : ''}`} />;
}

export function Badge({ color = 'brand', children, icon }) {
  return (
    <span className={`badge badge-${color}`}>
      {icon}
      {children}
    </span>
  );
}

export function Avatar({ name, color, size = 36 }) {
  const initials = String(name || '?')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] || '')
    .join('');
  return (
    <span className="avatar" style={{ background: color || '#6366f1', width: size, height: size, fontSize: size * 0.38 }}>
      {initials}
    </span>
  );
}

export function ScorePill({ percentage }) {
  const pct = Number(percentage) || 0;
  const cls = pct >= 70 ? 'good' : pct >= 50 ? 'mid' : 'bad';
  return (
    <span className={`score-pill ${cls}`}>
      {pct >= 70 ? <Icon name="checkCircle" size={14} /> : <Icon name="target" size={14} />}
      {pct}%
    </span>
  );
}

export function LevelBadge({ level }) {
  const { t } = useI18n();
  const colors = { L1: 'blue', L2: 'brand', L3: 'green', M1: 'amber', M2: 'red' };
  return <Badge color={colors[level] || 'gray'}>{t(`levels.${level}`) || level}</Badge>;
}

export function LangBadge({ lang }) {
  const label = { fr: 'FR', en: 'EN', ar: 'ع' }[lang] || lang;
  return <Badge color="gray">{label}</Badge>;
}

/* --------------------------------- loading -------------------------------- */

export function Skeleton({ w = '100%', h = 14, style, radius }) {
  return <span className="skeleton" style={{ width: w, height: h, borderRadius: radius || 9, display: 'block', ...style }} />;
}

export function QuizCardSkeleton() {
  return (
    <div className="card quiz-card" aria-hidden="true">
      <div className="row">
        <Skeleton w={40} h={40} radius={11} />
        <Skeleton w="55%" h={16} />
      </div>
      <Skeleton w="90%" h={12} />
      <Skeleton w="70%" h={12} />
      <div className="row mt-2">
        <Skeleton w={64} h={22} radius={999} />
        <Skeleton w={64} h={22} radius={999} />
        <Skeleton w={54} h={22} radius={999} />
      </div>
      <Skeleton w="100%" h={1} style={{ marginTop: 10 }} />
      <div className="row mt-1">
        <Skeleton w={90} h={12} />
        <Skeleton w={70} h={12} />
      </div>
    </div>
  );
}

export function RowSkeleton({ rows = 5 }) {
  return (
    <div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="row" style={{ padding: '14px 4px', borderBottom: '1px solid var(--line)' }}>
          <Skeleton w={34} h={34} radius="50%" />
          <Skeleton w="35%" h={13} />
          <span className="spacer" />
          <Skeleton w={70} h={13} />
          <Skeleton w={54} h={13} />
        </div>
      ))}
    </div>
  );
}

export function PageLoading() {
  const { t } = useI18n();
  return (
    <div className="page-loading" style={{ flexDirection: 'column', display: 'grid' }}>
      <Spinner size="lg" />
      <span className="mt-2">{t('common.loading')}</span>
    </div>
  );
}

/* ------------------------------- empty state ------------------------------ */

export function EmptyState({ icon = 'inbox', title, sub, action, onAction, actionIcon }) {
  return (
    <div className="empty fade-up">
      <div className="empty-ill">
        <Icon name={icon} size={42} strokeWidth={1.5} />
      </div>
      <h3>{title}</h3>
      {sub && <p>{sub}</p>}
      {action && (
        <button className="btn btn-primary" onClick={onAction}>
          {actionIcon && <Icon name={actionIcon} size={17} />}
          {action}
        </button>
      )}
    </div>
  );
}

/* ---------------------------------- modal --------------------------------- */

export function Modal({ open, onClose, title, children, footer, size = '' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`modal ${size}`} role="dialog" aria-modal="true">
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="close">
            <Icon name="x" size={17} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel, danger = true, busy }) {
  const { t } = useI18n();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} disabled={busy}>
            {busy && <Spinner size="white" />}
            {confirmLabel || t('common.confirm')}
          </button>
        </>
      }
    >
      <p style={{ margin: 0, color: 'var(--ink-soft)', lineHeight: 1.65 }}>{message}</p>
    </Modal>
  );
}

/* ---------------------------------- inputs -------------------------------- */

export function Field({ label, hint, error, children }) {
  return (
    <div className="field">
      {label && <label>{label}</label>}
      {children}
      {hint && !error && <span className="hint">{hint}</span>}
      {error && <span className="hint" style={{ color: 'var(--red)' }}>{error}</span>}
    </div>
  );
}

/** Dropdown menu anchored to a trigger button (closes on outside click). */
export function Menu({ trigger, items, align = 'end' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div className="menu-wrap" ref={ref}>
      <span onClick={() => setOpen((o) => !o)}>{trigger}</span>
      {open && (
        <div className="menu" style={align === 'end' ? { insetInlineEnd: 0 } : { insetInlineStart: 0 }}>
          {items.map((item, i) =>
            item === 'divider' ? (
              <hr key={i} className="divider" style={{ margin: '5px 0' }} />
            ) : (
              <button
                key={i}
                className={item.danger ? 'danger' : ''}
                onClick={() => {
                  setOpen(false);
                  item.onClick?.();
                }}
              >
                {item.icon && <Icon name={item.icon} size={16} />}
                {item.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

/* --------------------------------- charts --------------------------------- */

/** Tiny SVG bar chart for the dashboard activity. */
export function ActivityChart({ data, labelAttempts, labelAvg }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 110 }}>
        {data.map((d) => (
          <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, height: '100%', justifyContent: 'flex-end' }} title={`${d.date} — ${d.count} ${labelAttempts}${d.avg !== null ? ` · ${labelAvg}: ${d.avg}%` : ''}`}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: d.count ? 'var(--brand)' : 'var(--faint)' }}>{d.count || ''}</span>
            <span
              style={{
                width: '100%',
                maxWidth: 26,
                borderRadius: '7px 7px 3px 3px',
                minHeight: 5,
                height: `${Math.max(6, (d.count / max) * 82)}%`,
                background: d.count ? 'var(--grad)' : '#e6e9f2',
                transition: 'height 0.4s ease',
              }}
            />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 5, marginTop: 7 }}>
        {data.map((d, i) => (
          <div key={d.date} style={{ flex: 1, textAlign: 'center', fontSize: 9.5, color: 'var(--faint)', fontWeight: 600 }}>
            {i % 2 === 0 ? d.date.slice(8) : ''}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Donut score ring used in the result hero. */
export function ScoreRing({ percentage, size = 148, stroke = 12, color }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, Number(percentage) || 0));
  const strokeColor = color || (pct >= 70 ? '#059669' : pct >= 50 ? '#d97706' : '#dc2626');
  return (
    <div className="score-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eceef6" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={strokeColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (pct / 100) * c}
          style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.2,0.9,0.3,1)' }}
        />
      </svg>
      <span className="val" style={{ color: strokeColor }}>
        {pct}%
      </span>
    </div>
  );
}
