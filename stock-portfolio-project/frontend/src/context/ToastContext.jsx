import React, { createContext, useContext, useCallback, useReducer, useRef } from 'react';

/* ─────────────────────────────────────────────
   Constants
───────────────────────────────────────────── */
const MAX_VISIBLE = 4;
const AUTO_DISMISS_MS = 4000;

/* ─────────────────────────────────────────────
   Context
───────────────────────────────────────────── */
const ToastContext = createContext(null);

/* ─────────────────────────────────────────────
   Reducer
───────────────────────────────────────────── */
function reducer(state, action) {
  switch (action.type) {
    case 'ADD': {
      const { queue, visible } = state;
      if (visible.length < MAX_VISIBLE) {
        return { visible: [...visible, action.toast], queue };
      }
      return { visible, queue: [...queue, action.toast] };
    }

    case 'DISMISS': {
      const visible = state.visible.filter((t) => t.id !== action.id);
      // Promote from queue if slot opens
      if (state.queue.length > 0) {
        const [next, ...rest] = state.queue;
        return { visible: [...visible, next], queue: rest };
      }
      return { ...state, visible };
    }

    default:
      return state;
  }
}

/* ─────────────────────────────────────────────
   Provider
───────────────────────────────────────────── */
export function ToastProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, { visible: [], queue: [] });
  const timersRef = useRef({});

  const dismiss = useCallback((id) => {
    clearTimeout(timersRef.current[id]);
    delete timersRef.current[id];
    dispatch({ type: 'DISMISS', id });
  }, []);

  const addToast = useCallback(
    (type, message) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const toast = { id, type, message, createdAt: Date.now() };
      dispatch({ type: 'ADD', toast });

      // Schedule auto-dismiss
      timersRef.current[id] = setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss]
  );

  const toast = {
    success: (msg) => addToast('success', msg),
    error:   (msg) => addToast('error',   msg),
    info:    (msg) => addToast('info',    msg),
    warning: (msg) => addToast('warning', msg),
  };

  return (
    <ToastContext.Provider value={{ toast, visible: state.visible, dismiss }}>
      {children}
    </ToastContext.Provider>
  );
}

/* ─────────────────────────────────────────────
   Hook
───────────────────────────────────────────── */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
