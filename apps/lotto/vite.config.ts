/// <reference types="vitest/config" />
import { appPorts, domainBase, getDomain } from '@songiland/catalog';
import { songilandTestConfig } from '@songiland/test-config';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// 이 앱은 포털 아래 `/games/lotto/`에 배포된다. base는 카탈로그가 정한 경로를 따르고,
// 라우터 basename은 main.tsx에서 import.meta.env.BASE_URL로 같은 값을 읽는다.
// 개발 중에는 포털 dev 서버(5173)가 이 경로를 이 앱으로 프록시한다.
export default defineConfig({
  base: domainBase(getDomain('lotto')),
  plugins: [react()],
  server: { port: appPorts.lotto.dev, strictPort: true },
  preview: { port: appPorts.lotto.preview, strictPort: true },
  test: songilandTestConfig,
});
