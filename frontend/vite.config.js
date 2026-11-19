import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Le routeur utilise l'adresse « #/… » (HashRouter) : aucune configuration serveur
// particulière n'est nécessaire, `dist/` peut être servi tel quel.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 }, // origine déjà autorisée par le CORS de l'API
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    css: false,
  },
});
