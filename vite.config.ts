/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    // Playwright specs live under tests/e2e and are run by @playwright/test, not Vitest.
    exclude: ['node_modules', 'dist', 'tests/e2e/**'],
  },
});
