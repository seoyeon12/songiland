import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'playwright-report', 'test-results'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // 앱·패키지 경계는 상대 경로가 아니라 워크스페이스 패키지 이름으로만 넘는다.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/apps/*/**', '**/packages/*/**'],
              message:
                '다른 앱·패키지는 상대 경로 대신 @songiland/* 패키지 이름으로 import하세요.',
            },
          ],
        },
      ],
    },
  },
  prettier,
);
