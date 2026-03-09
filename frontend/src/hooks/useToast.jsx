import { useState, useCallback, useRef } from 'react';

const MAX_TOASTS = 3;
const AUTO_DISMISS_MS = 5000;

let toastIdCounter = 0;

/**
 * In-app toast notification system.
 * Returns: { toasts, addToast, removeToast, ToastContainer }
 */
export function useToast() {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
  }, []);

  const addToast = useCallback((message, type = 'info') => {
    const id = ++toastIdCounter;
    const toast = { id, message, type, createdAt: Date.now() };

    setToasts(prev => {
      const next = [...prev, toast];
      // Keep only MAX_TOASTS
      if (next.length > MAX_TOASTS) {
        const removed = next.shift();
        if (timersRef.current[removed.id]) {
          clearTimeout(timersRef.current[removed.id]);
          delete timersRef.current[removed.id];
        }
      }
      return next;
    });

    // Auto-dismiss
    timersRef.current[id] = setTimeout(() => removeToast(id), AUTO_DISMISS_MS);

    return id;
  }, [removeToast]);

  return { toasts, addToast, removeToast };
}

const TOAST_STYLES = {
  success: {
    bg: 'bg-emerald-50 border-emerald-200',
    text: 'text-emerald-800',
    icon: '✅',
    bar: 'bg-emerald-500',
  },
  error: {
    bg: 'bg-rose-50 border-rose-200',
    text: 'text-rose-800',
    icon: '❌',
    bar: 'bg-rose-500',
  },
  info: {
    bg: 'bg-indigo-50 border-indigo-200',
    text: 'text-indigo-800',
    icon: 'ℹ️',
    bar: 'bg-indigo-500',
  },
  warning: {
    bg: 'bg-amber-50 border-amber-200',
    text: 'text-amber-800',
    icon: '⚠️',
    bar: 'bg-amber-500',
  },
};

export function ToastContainer({ toasts, removeToast }) {
  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => {
        const style = TOAST_STYLES[toast.type] || TOAST_STYLES.info;
        const elapsed = Date.now() - toast.createdAt;
        const remaining = Math.max(0, AUTO_DISMISS_MS - elapsed);

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 px-4 py-3.5 rounded-2xl border shadow-xl backdrop-blur-sm min-w-[320px] max-w-[420px] animate-slide-in-right ${style.bg}`}
            role="alert"
          >
            <span className="text-[16px] shrink-0 mt-0.5">{style.icon}</span>
            <p className={`text-[13px] font-semibold flex-1 ${style.text}`}>{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 text-[16px] leading-none shrink-0 transition-colors"
              aria-label="Close"
            >
              ×
            </button>
            {/* Progress bar */}
            <div className="absolute bottom-0 left-4 right-4 h-[3px] rounded-full bg-slate-200/50 overflow-hidden">
              <div
                className={`h-full rounded-full ${style.bar}`}
                style={{
                  width: '100%',
                  animation: `shrink ${remaining}ms linear forwards`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
