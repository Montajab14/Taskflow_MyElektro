// Configuration du front MyElektro.
// useMock = false : le front parle à la vraie API (backend/, port 3001).
// (pratique tant que les routes /api/tasks du backend ne sont pas prêtes).
// Passez à false pour parler à la vraie API.
window.MYELEKTRO_CONFIG = {
  apiUrl: 'http://localhost:3001/api',
  useMock: false,
};
