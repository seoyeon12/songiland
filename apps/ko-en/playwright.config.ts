import { appHosts } from '@songiland/catalog';
import { defineConfig, devices } from '@playwright/test';

const origin = `http://localhost:${appHosts['ko-en'].previewPort}`;

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
    {
      name: 'chromium',
      // 결과 복사 확인을 위해 클립보드 권한을 준다.
      use: {
        ...devices['Desktop Chrome'],
        permissions: ['clipboard-read', 'clipboard-write'],
      },
    },
  ],
  webServer: {
    command: 'pnpm build && pnpm preview',
    url: origin,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
