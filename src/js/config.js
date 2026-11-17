// Configuration du front MyElektro.
// useMock = true : le front fonctionne seul, avec des données dans le localStorage
// (pratique tant que les routes /api/tasks du backend ne sont pas prêtes).
// Passez à false pour parler à la vraie API.
window.MYELEKTRO_CONFIG = {
  apiUrl: 'http://localhost:3001/api',
  useMock: true,
};
