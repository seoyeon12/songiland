/// <reference types="vitest/config" />
import { songilandTestConfig } from '@songiland/test-config';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// 이 앱은 Cloudflare Pages 프로젝트 하나로 https://bbang.arosys.kr/ 루트에 배포된다(4단계 등록).
// 포트는 기존 앱(5173~5176 · 4173~4176) 다음 번호를 쓴다. 카탈로그 등록은 4단계.
export default defineConfig({
  plugins: [react()],
  server: { port: 5177, strictPort: true },
  preview: { port: 4177, strictPort: true },
  test: songilandTestConfig,
});
