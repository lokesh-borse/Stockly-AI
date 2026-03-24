import React, { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';

/* ─────────────────────────────────────────────
   CSS injected once — slide-in + fade-out
───────────────────────────────────────────── */
const toastCSS = `
@keyframes toast-slide-in {
  from { transform: translateX(110%); opacity: 0; }
  to   { transform: translateX(0);    opacity: 1; }
}

@keyframes toast-fade-out {
  from { transform: translateX(0);  opacity: 1; max-height: 120px; margin-bottom: 10px; }
  to   { transform: translateX(110%); opacity: 0; max-height: 0;   margin-bottom: 0;  }
}

.toast-enter {
  animation: toast-slide-in 0.35s cubic-bezier(0.34, 1.2, 0.64, 1) forwards;
}

.toast-exit {
  animation: toast-fade-out 0.4s ease-in forwards;
  pointer-events: none;
  overflow: hidden;
}
`;

let toastCSSInjected = false;
function injectToastCSS() {
  if (toastCSSInjected || typeof document === 'undefined') return;
  const tag = document.createElement('style');
  tag.textContent = toastCSS;
  document.head.appendChild(tag);
  toastCSSInjected = true;
}

/* ─────────────────────────────────────────────
   Config per toast type
───────────────────────────────────────────── */
const CONFIG = {
  success: {
    border: '#22c55e',       // green-500
    bg: 'rgba(22, 101, 52, 0.25)',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="text-green-400" width="18" height="18">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
      </svg>
    ),
    label: 'Success',
    labelColor: '#4ade80',
  },
  error: {
    border: '#ef4444',       // red-500
    bg: 'rgba(127, 29, 29, 0.25)',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="text-red-400" width="18" height="18">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
      </svg>
    ),
    label: 'Error',
    labelColor: '#f87171',
  },
  info: {
    border: '#3b82f6',       // blue-500
    bg: 'rgba(30, 58, 138, 0.25)',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="text-blue-400" width="18" height="18">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
      </svg>
    ),
    label: 'Info',
    labelColor: '#60a5fa',
  },
  warning: {
    border: '#f59e0b',       // amber-500
    bg: 'rgba(120, 53, 15, 0.25)',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="text-yellow-400" width="18" height="18">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
      </svg>
    ),
    label: 'Warning',
    labelColor: '#fbbf24',
  },
};

/* ─────────────────────────────────────────────
   ToastItem — individual toast bubble
───────────────────────────────────────────── */
function ToastItem({ toast, onDismiss }) {
  const [exiting, setExiting] = useState(false);
  const cfg = CONFIG[toast.type] ?? CONFIG.info;

  const handleClose = () => {
    setExiting(true);
    // Wait for animation to finish, then remove from context
    setTimeout(() => onDismiss(toast.id), 400);
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={exiting ? 'toast-exit' : 'toast-enter'}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        minWidth: '300px',
        maxWidth: '380px',
        padding: '13px 14px',
        borderRadius: '10px',
        borderLeft: `4px solid ${cfg.border}`,
        background: cfg.bg,
        backdropFilter: 'blur(12px)',
        boxShadow: '0 8px 30px rgba(0,0,0,0.45)',
        marginBottom: '10px',
        position: 'relative',
      }}
    >
      {/* Icon */}
      <div style={{ marginTop: '2px', flexShrink: 0 }}>{cfg.icon}</div>

      {/* Text */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <p
          style={{
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: cfg.labelColor,
            marginBottom: '2px',
          }}
        >
          {cfg.label}
        </p>
        <p
          style={{
            fontSize: '13.5px',
            color: '#e2e8f0',
            lineHeight: '1.45',
            wordBreak: 'break-word',
          }}
        >
          {toast.message}
        </p>
      </div>

      {/* Close button */}
      <button
        onClick={handleClose}
        aria-label="Close notification"
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: '#94a3b8',
          padding: '2px',
          lineHeight: 1,
          flexShrink: 0,
          transition: 'color 0.2s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#e2e8f0')}
        onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
      >
        <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
        </svg>
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ToastContainer — renders all visible toasts
   Place once near the root (already done by ToastProvider wrapping)
───────────────────────────────────────────── */
export function ToastContainer() {
  injectToastCSS();
  const { visible, dismiss } = useToast();

  if (visible.length === 0) return null;

  return (
    <div
      aria-label="Notifications"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column-reverse',   // newest toast at bottom
        alignItems: 'flex-end',
        pointerEvents: 'none',
      }}
    >
      {visible.map((t) => (
        <div key={t.id} style={{ pointerEvents: 'auto' }}>
          <ToastItem toast={t} onDismiss={dismiss} />
        </div>
      ))}
    </div>
  );
}
