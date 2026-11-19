// Configuration du front MyElektro.
//
// apiUrl  : adresse de l'API (dossier backend/, port 3001 par défaut).
// useMock : false = le front parle à la vraie API.
//           true  = faux serveur en localStorage, pour développer sans backend
//                   (gère la connexion, les étapes et le résumé, pas les habitudes
//                   ni l'activité). Ne jamais l'activer en production.
window.MYELEKTRO_CONFIG = {
  apiUrl: 'http://localhost:3001/api',
  useMock: false,
};
