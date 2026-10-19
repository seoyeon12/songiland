/// <reference types="vitest/config" />
import { songilandTestConfig } from '@songiland/test-config';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// 포털은 사이트 루트(`/`)에 배포된다. 각 도메인 앱은 자기 경로(/games/<id>, /tools/<id>)를
// base로 쓰고 포트도 하나씩 비켜 쓴다: 포털 5173/4173, lotto 5174/4174.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
  test: songilandTestConfig,
});
