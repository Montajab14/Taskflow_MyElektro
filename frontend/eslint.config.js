import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  { ignores: ['dist', 'node_modules', 'serve.cjs'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Les composants ne sont référencés que dans le JSX : on n'impose pas de les « utiliser » autrement.
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_' }],
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    // Un contexte exporte son Provider et son hook : c'est voulu (le rechargement à chaud se fait page entière).
    files: ['src/context/**', '**/*.test.{js,jsx}', 'src/test/**'],
    languageOptions: { globals: { ...globals.browser, ...globals.vitest } },
    rules: { 'react-refresh/only-export-components': 'off' },
  },
];
