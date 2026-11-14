/// <reference types="vitest/config" />
import { songilandTestConfig } from '@songiland/test-config';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// 이 앱은 Cloudflare Pages 프로젝트 하나로 https://bunguppang.arosys.kr/ 루트에 배포된다.
// 포트는 @songiland/catalog의 appHosts.bbang(5177 · 4177)과 같다.
export default defineConfig({
  plugins: [react()],
  server: { port: 5177, strictPort: true },
  preview: { port: 4177, strictPort: true },
  test: songilandTestConfig,
});
