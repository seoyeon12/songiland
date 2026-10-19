/**
 * 송이랜드 앱 공통 Vitest 설정. 앱의 vite.config.ts에서 `test`에 펼쳐 쓴다.
 * @type {import('vitest/node').InlineConfig}
 */
export const songilandTestConfig = {
  globals: true,
  environment: 'jsdom',
  setupFiles: ['@songiland/test-config/setup'],
  css: true,
  // Playwright specs live under tests/e2e and are run by @playwright/test, not Vitest.
  exclude: ['node_modules', 'dist', 'tests/e2e/**'],
};
