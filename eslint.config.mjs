import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const reactHooksRecommended = reactHooks.configs.flat['recommended-latest'];
const reactRefreshVite = reactRefresh.configs.vite;

export default [
  {
    ignores: ['dist/**', 'coverage/**', 'playwright-report/**', 'test-results/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      globals: globals.browser,
    },
    plugins: {
      ...reactHooksRecommended.plugins,
      ...reactRefreshVite.plugins,
    },
    rules: {
      ...reactHooksRecommended.rules,
      ...reactRefreshVite.rules,
    },
  },
  prettier,
];
