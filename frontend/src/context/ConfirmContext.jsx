import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const ConfirmContext = createContext(() => Promise.resolve(false));

/**
 * Fenêtre de confirmation (balise <dialog> native : focus piégé et Échap gérés par le navigateur).
 * useConfirm() renvoie une fonction qui résout true si l'utilisateur confirme.
 */
export function ConfirmProvider({ children }) {
  const dialog = useRef(null);
  const resolver = useRef(null);
  const [options, setOptions] = useState({ title: '', text: '', action: 'Supprimer' });

  const confirm = useCallback((opts) => new Promise((resolve) => {
    resolver.current = resolve;
    setOptions({ action: 'Supprimer', ...opts });
    dialog.current.returnValue = '';
    dialog.current.showModal();
  }), []);

  const onClose = () => {
    resolver.current?.(dialog.current.returnValue === 'confirm');
    resolver.current = null;
  };

  const value = useMemo(() => confirm, [confirm]);
  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <dialog ref={dialog} className="dialog" onClose={onClose}>
        <form method="dialog">
          <h2>{options.title}</h2>
          <p>{options.text}</p>
          <div className="dialog-actions">
            <button className="btn ghost" value="cancel">Annuler</button>
            <button className="btn danger" value="confirm">{options.action}</button>
          </div>
        </form>
      </dialog>
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);
