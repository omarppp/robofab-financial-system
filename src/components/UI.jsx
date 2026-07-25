import React, { useState, useEffect } from 'react';

// ── Toast System ──────────────────────────────────────────
let addToastFn = null;
export const toast = {
  success: (msg) => addToastFn?.('success', msg),
  error:   (msg) => addToastFn?.('error',   msg),
  warning: (msg) => addToastFn?.('warning', msg),
  info:    (msg) => addToastFn?.('info',    msg),
};

const TOAST_ICONS = {
  success: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
      <polyline points="20,6 9,17 4,12"/>
    </svg>
  ),
  error: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
      <path d="M18 6L6 18M6 6l12 12"/>
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  info: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
};

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  useEffect(() => {
    addToastFn = (type, message) => {
      const id = Date.now();
      setToasts(t => [...t, { id, type, message }]);
      setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
    };
  }, []);
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          {TOAST_ICONS[t.type]}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

// ── Confirm Dialog ─────────────────────────────────────────
let confirmFn = null;
export const confirm = (title, message) =>
  new Promise(resolve => confirmFn?.({ title, message, resolve }));

export function ConfirmProvider() {
  const [state, setState] = useState(null);
  useEffect(() => {
    confirmFn = ({ title, message, resolve }) => setState({ title, message, resolve });
  }, []);
  if (!state) return null;
  const handle = (val) => { state.resolve(val); setState(null); };
  return (
    <div className="confirm-overlay" onClick={() => handle(false)}>
      <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" width="26" height="26">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <h3>{state.title}</h3>
        <p>{state.message}</p>
        <div className="btn-row">
          <button className="btn btn-danger" onClick={() => handle(true)}>تأكيد</button>
          <button className="btn btn-ghost" onClick={() => handle(false)}>إلغاء</button>
        </div>
      </div>
    </div>
  );
}

// ── Modal ──────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, size = '', footer }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal ${size ? `modal-${size}` : ''}`} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

// ── Status Badge ───────────────────────────────────────────
export function StatusBadge({ status, map }) {
  if (!map || !map[status]) return <span className="badge badge-muted">{status}</span>;
  const { label, color } = map[status];
  return <span className={`badge badge-${color}`}>{label}</span>;
}

// ── Empty State ────────────────────────────────────────────
export function EmptyState({ icon, title, message, action }) {
  return (
    <div className="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        {icon || <path d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0l-8-6-8 6"/>}
      </svg>
      <h3>{title || 'لا توجد بيانات'}</h3>
      <p>{message || 'لم يتم إضافة أي سجلات بعد'}</p>
      {action && <div style={{ marginTop: 20 }}>{action}</div>}
    </div>
  );
}

// ── Search Input ───────────────────────────────────────────
export function SearchInput({ value, onChange, placeholder = 'بحث...' }) {
  return (
    <div className="search-input-wrap">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
      </svg>
      <input
        className="form-control"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

// ── Select ─────────────────────────────────────────────────
export function Select({ value, onChange, options, placeholder = 'اختر...', className = '' }) {
  return (
    <select className={`form-control ${className}`} value={value} onChange={e => onChange(e.target.value)}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// ── KPI Card ───────────────────────────────────────────────
export function KpiCard({ label, value, color = 'blue', icon, sub }) {
  return (
    <div className={`kpi-card ${color}`}>
      {icon && <div className={`kpi-icon ${color}`}>{icon}</div>}
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {sub && <div className="kpi-change">{sub}</div>}
    </div>
  );
}

// ── Tabs ───────────────────────────────────────────────────
export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="tabs">
      {tabs.map(tab => (
        <button
          key={tab.key}
          className={`tab-btn ${active === tab.key ? 'active' : ''}`}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className="badge badge-muted" style={{ marginRight: 6 }}>{tab.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

// ── Loading Spinner ────────────────────────────────────────
export function Spinner() {
  return <div className="spinner" />;
}

// ── Pagination ─────────────────────────────────────────────
export function usePagination(items, perPage = 20) {
  const [page, setPage] = useState(1);
  const total = Math.ceil(items.length / perPage);
  const paged = items.slice((page - 1) * perPage, page * perPage);
  return { paged, page, total, setPage };
}

export function Pagination({ page, total, onChange }) {
  if (total <= 1) return null;
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', padding: '16px 0', flexWrap: 'wrap' }}>
      <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>السابق</button>
      {Array.from({ length: total }, (_, i) => (
        <button
          key={i + 1}
          className={`btn btn-sm ${page === i + 1 ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => onChange(i + 1)}
        >
          {i + 1}
        </button>
      ))}
      <button className="btn btn-ghost btn-sm" disabled={page >= total} onClick={() => onChange(page + 1)}>التالي</button>
    </div>
  );
}

// ── Form Field ─────────────────────────────────────────────
export function Field({ label, required, error, children, span }) {
  return (
    <div className="form-group" style={span ? { gridColumn: `span ${span}` } : {}}>
      {label && <label>{required && <span className="required">*</span>}{label}</label>}
      {children}
      {error && <div className="form-error">{error}</div>}
    </div>
  );
}

// ── Summary Row ────────────────────────────────────────────
export function SummaryRow({ label, value, bold, large, color }) {
  return (
    <div
      className="invoice-total-row"
      style={large ? { borderTop: '2px solid var(--primary-border)', paddingTop: 10, marginTop: 6 } : {}}
    >
      <span style={{ fontWeight: bold ? 700 : 500, color: color || 'inherit', fontSize: large ? 15 : 14 }}>{label}</span>
      <span style={{ fontWeight: bold ? 800 : 600, color: color || (large ? 'var(--primary-dark)' : 'inherit'), fontSize: large ? 17 : 14 }}>{value}</span>
    </div>
  );
}

// ── Page Header ────────────────────────────────────────────
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="page-header">
      <div>
        <div className="page-header-title">{title}</div>
        {subtitle && <div className="page-header-sub">{subtitle}</div>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </div>
  );
}

// ── Icon Button ────────────────────────────────────────────
export function IconBtn({ onClick, title, color = 'ghost', children, disabled }) {
  return (
    <button
      className={`btn btn-${color} btn-icon btn-sm`}
      onClick={onClick}
      title={title}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

// ── Filter Bar ─────────────────────────────────────────────
export function FilterBar({ children }) {
  return <div className="filter-bar">{children}</div>;
}
