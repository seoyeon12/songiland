import { appHosts } from '@songiland/catalog';
import { defineConfig, devices } from '@playwright/test';

const origin = `http://localhost:${appHosts.aiueo.previewPort}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: origin,
    trace: 'on-first-retry',
  },
  projects: [
    // 휴대폰이 주 사용 환경이라 모바일 화면을 먼저 확인한다. 둘 다 chromium 엔진이다.
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'pnpm build && pnpm preview',
    url: origin,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
