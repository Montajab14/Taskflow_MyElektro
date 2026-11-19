import { useEffect, useRef, useState } from 'react';

/**
 * Charge des données quand la page s'affiche ou que `key` change : { data, error, loading, reload }.
 * Une réponse arrivée après un nouvel appel (ou après le démontage) est ignorée.
 * reload() sert au bouton « Réessayer » et après une action (silent : sans écran de chargement).
 */
export default function useAsync(loader, key = '') {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const [tick, setTick] = useState(0);
  const latest = useRef(loader);
  useEffect(() => { latest.current = loader; });

  useEffect(() => {
    let current = true;
    latest.current().then(
      (data) => { if (current) setState({ data, error: null, loading: false }); },
      (error) => { if (current) setState({ data: null, error, loading: false }); },
    );
    return () => { current = false; };
  }, [key, tick]);

  const reload = ({ silent = false } = {}) => {
    if (!silent) setState((s) => ({ ...s, loading: true, error: null }));
    setTick((t) => t + 1);
  };
  return { ...state, reload };
}
