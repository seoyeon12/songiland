/// <reference types="vitest/config" />
import { appHosts } from '@songiland/catalog';
import { songilandTestConfig } from '@songiland/test-config';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// 포털은 Cloudflare Pages 프로젝트 하나로 https://songiland.arosys.kr/ 루트에 배포된다.
// 도메인 앱은 각자 서브도메인을 쓰므로 로컬에서도 앱마다 자기 포트로 따로 뜬다.
export default defineConfig({
  plugins: [react()],
  server: { port: appHosts.portal.devPort, strictPort: true },
  preview: { port: appHosts.portal.previewPort, strictPort: true },
  test: songilandTestConfig,
});
