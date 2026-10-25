/// <reference types="vitest/config" />
import { songilandTestConfig } from '@songiland/test-config';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// 견생극장은 Cloudflare Pages 프로젝트 하나로 https://dog.arosys.kr/ 루트에 배포될 예정이다.
// 카탈로그 등록(포털 카드·포트 표)은 6단계에서 하므로 그때까지 포트를 여기 둔다.
export default defineConfig({
  plugins: [react()],
  server: { port: 5176, strictPort: true },
  preview: { port: 4176, strictPort: true },
  test: songilandTestConfig,
});
