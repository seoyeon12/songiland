import { appHosts } from '@songiland/catalog';
import { defineConfig, devices } from '@playwright/test';

const origin = `http://localhost:${appHosts.dog.previewPort}`;

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
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm build && pnpm preview',
    url: origin,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
