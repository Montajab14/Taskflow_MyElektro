// Icônes au trait (tracés de lucide, licence ISC) : une taille et une épaisseur pour toute l'interface.
const ICONS = {
  plus: <><path d="M5 12h14" /><path d="M12 5v14" /></>,
  back: <><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></>,
  alert: <><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" /><path d="M12 9v4" /><path d="M12 17h.01" /></>,
  pencil: <><path d="M21.17 6.81a1 1 0 0 0-3.98-3.99L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5z" /><path d="m15 5 4 4" /></>,
  trash: <><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M10 11v6" /><path d="M14 11v6" /></>,
  search: <><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></>,
  up: <><path d="m5 12 7-7 7 7" /><path d="M12 19V5" /></>,
  down: <><path d="M12 5v14" /><path d="m19 12-7 7-7-7" /></>,
  eye: <><path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0" /><circle cx="12" cy="12" r="3" /></>,
  eyeOff: <><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c4.5 0 8.34 2.77 9.94 6.65a1 1 0 0 1 0 .7 10.8 10.8 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.53 13.53 0 0 0 2.06 11.65a1 1 0 0 0 0 .7C3.66 16.23 7.5 19 12 19a9.74 9.74 0 0 0 5.39-1.61" /><path d="m2 2 20 20" /><path d="M9.88 9.88a3 3 0 0 0 4.24 4.24" /></>,
  check: <path d="M20 6 9 17l-5-5" />,
  x: <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></>,
};

export default function Icon({ name }) {
  return <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">{ICONS[name]}</svg>;
}
