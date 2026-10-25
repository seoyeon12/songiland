/// <reference types="vitest/config" />
import { appHosts } from '@songiland/catalog';
import { songilandTestConfig } from '@songiland/test-config';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// 이 앱은 Cloudflare Pages 프로젝트 하나로 https://lotto.arosys.kr/ 루트에 배포된다.
export default defineConfig({
  plugins: [react()],
  server: { port: appHosts.lotto.devPort, strictPort: true },
  preview: { port: appHosts.lotto.previewPort, strictPort: true },
  test: songilandTestConfig,
});
