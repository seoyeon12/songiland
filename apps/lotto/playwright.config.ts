import { appPorts } from '@songiland/catalog';
import { defineConfig, devices } from '@playwright/test';

const origin = `http://localhost:${appPorts.lotto.preview}`;

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
      // Enable touch so the mobile paw-mode spec can use tap(); keyboard/mouse
      // specs are unaffected.
      use: { ...devices['Desktop Chrome'], hasTouch: true },
    },
  ],
  webServer: {
    command: 'pnpm build && pnpm preview',
    url: `${origin}/games/lotto/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
