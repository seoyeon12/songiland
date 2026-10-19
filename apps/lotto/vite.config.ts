/// <reference types="vitest/config" />
import { domainPath, getDomain } from '@songiland/catalog';
import { songilandTestConfig } from '@songiland/test-config';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// 이 앱은 포털 아래 `/games/lotto/`에 배포된다. base는 카탈로그가 정한 경로를 따르고,
// 라우터 basename은 main.tsx에서 import.meta.env.BASE_URL로 같은 값을 읽는다.
// 포트는 포털(5173/4173)과 겹치지 않게 하나 비킨다.
export default defineConfig({
  base: `${domainPath(getDomain('lotto'))}/`,
  plugins: [react()],
  server: { port: 5174, strictPort: true },
  preview: { port: 4174, strictPort: true },
  test: songilandTestConfig,
});
