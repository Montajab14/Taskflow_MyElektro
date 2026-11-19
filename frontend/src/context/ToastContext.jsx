import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const ToastContext = createContext(() => {});

/** Petit message temporaire en bas de l'écran (annoncé aux lecteurs d'écran via role="status"). */
export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timer = useRef();

  const show = useCallback((message, kind = 'ok') => {
    clearTimeout(timer.current);
    setToast({ message, kind });
    timer.current = setTimeout(() => setToast(null), 3500);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);

  const value = useMemo(() => show, [show]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div id="toast" className={`toast ${toast ? toast.kind : ''}`} role="status" aria-live="polite" hidden={!toast}>
        {toast ? toast.message : ''}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
