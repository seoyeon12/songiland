/// <reference types="vitest/config" />
import { appPorts, domainPath, domains } from '@songiland/catalog';
import { songilandTestConfig } from '@songiland/test-config';
import react from '@vitejs/plugin-react';
import { defineConfig, type ProxyOptions } from 'vite';

// 포털은 사이트 루트(`/`)에 배포된다. 로컬에서는 각 도메인 경로(/games/<id>…)를 해당 앱의
// dev/preview 서버로 넘겨 배포본처럼 한 origin에서 돌아다닐 수 있게 한다.
// 도메인 앱도 같은 경로를 base로 쓰므로 경로를 고쳐 쓰지 않고 그대로 넘긴다(HMR 웹소켓 포함).
function domainProxy(
  port: (ports: { dev: number; preview: number }) => number,
): Record<string, ProxyOptions> {
  return Object.fromEntries(
    domains.map((domain) => [
      // `/games/lotto`와 그 하위만 잡고 `/games/lottoX` 같은 이웃 경로는 건드리지 않는다.
      `^${domainPath(domain)}(/|$)`,
      { target: `http://localhost:${port(appPorts[domain.id])}`, ws: true },
    ]),
  );
}

export default defineConfig({
  plugins: [react()],
  server: {
    port: appPorts.portal.dev,
    strictPort: true,
    proxy: domainProxy((ports) => ports.dev),
  },
  preview: {
    port: appPorts.portal.preview,
    strictPort: true,
    proxy: domainProxy((ports) => ports.preview),
  },
  test: songilandTestConfig,
});
