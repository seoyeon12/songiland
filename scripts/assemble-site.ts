// 각 앱의 빌드 결과를 Cloudflare Pages 한 프로젝트가 올릴 루트 `dist/`로 모은다.
//   apps/portal/dist        -> dist/
//   apps/<id>/dist          -> dist/<kind 구간>/<id>/   (경로는 @songiland/catalog의 domainBase)
// 사용: pnpm build (앱 빌드 뒤 자동 실행) 또는 node scripts/assemble-site.ts
// 루트에는 워크스페이스 의존성이 없으므로 카탈로그는 소스 경로로 직접 읽는다(Node 타입 제거 실행).
import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { domainBase, domains } from '../packages/catalog/src/index.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'dist');

function appDist(appDir: string): string {
  const dist = join(root, 'apps', appDir, 'dist');
  if (!existsSync(join(dist, 'index.html'))) {
    throw new Error(`${appDir} 빌드 결과가 없습니다: ${dist}. 먼저 pnpm build를 실행하세요.`);
  }
  return dist;
}

/** 앱이 자기 base 밖의 자산을 참조하면 합친 사이트에서 깨지므로 미리 막는다. */
function assertAssetsUnder(indexHtml: string, base: string, appDir: string): void {
  const html = readFileSync(indexHtml, 'utf8');
  const refs = [...html.matchAll(/(?:src|href)="(\/[^"]*)"/g)].map((m) => m[1]);
  const stray = refs.filter((ref) => !ref.startsWith(base));
  if (stray.length > 0) {
    throw new Error(
      `${appDir}의 index.html이 base(${base}) 밖을 참조합니다: ${stray.join(', ')}. vite.config.ts의 base를 확인하세요.`,
    );
  }
}

rmSync(out, { recursive: true, force: true });

const portalDist = appDist('portal');
cpSync(portalDist, out, { recursive: true });

for (const domain of domains) {
  // 앱 폴더 이름은 도메인 id와 같다는 규칙(apps/<id>)을 따른다.
  const dist = appDist(domain.id);
  const base = domainBase(domain);
  assertAssetsUnder(join(dist, 'index.html'), base, domain.id);
  const target = join(out, base);
  if (existsSync(target)) {
    throw new Error(`포털 빌드와 ${domain.id} 경로가 겹칩니다: ${base}`);
  }
  cpSync(dist, target, { recursive: true });
  console.log(`assembled ${domain.id} -> dist${base}`);
}

// 최상위 404.html이 있으면 Pages는 SPA 폴백(모든 경로에 루트 index.html)을 끄고
// 없는 경로에 404 상태로 이 파일을 보낸다. 포털 화면을 그대로 써서 길을 잃은 방문자를 안내한다.
cpSync(join(out, 'index.html'), join(out, '404.html'));

// Vite 산출 자산은 파일명에 해시가 붙으므로 오래 캐시하고, HTML은 매번 새로 확인하게 둔다.
const assetPaths = ['/assets/*', ...domains.map((d) => `${domainBase(d)}assets/*`)];
writeFileSync(
  join(out, '_headers'),
  [
    '/*',
    '  X-Content-Type-Options: nosniff',
    '  Referrer-Policy: strict-origin-when-cross-origin',
    ...assetPaths.flatMap((path) => [
      path,
      '  Cache-Control: public, max-age=31536000, immutable',
    ]),
    '',
  ].join('\n'),
);

console.log(`site ready: ${out}`);
