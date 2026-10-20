# 송이랜드 모노레포 마이그레이션 현황

기준일: 2026-10-20

단일 Vite 앱이던 송이랜드를 pnpm 워크스페이스 모노레포로 옮기는 작업의 진행 상황이다.
도메인(게임·도구)마다 `apps/` 아래 독립 앱을 두고, 공유 코드는 `packages/`에 둔다.

## 확정된 결정

- 도메인마다 앱 하나를 둔다. 게임 주소는 `/games/<id>`, 도구 주소는 `/tools/<id>`다.
- 한/영 변환기는 예정된 도구 도메인이다. 강화게임은 예시였을 뿐이므로 만들지 않는다.
- 호스팅은 Cloudflare Pages다.
- 배포 형태는 경로 기반 단일 Pages 프로젝트로 구현했다. 에이전트가 주소 규칙에 맞춰
  고른 기본값이며, 개발자의 최종 확인이 남아 있다(아래 "남은 일" 참고).

## 단계별 상태

| 단계 | 내용 | 상태 |
| ---- | ---- | ---- |
| 1 | pnpm 워크스페이스 구성, 기존 앱을 `apps/lotto`로 이동 | 커밋됨 (24bdfe4) |
| 2 | `tsconfig.base.json`, `packages/eslint-config`, `packages/test-config` | 커밋됨 (24bdfe4) |
| 3 | `packages/a11y`, `packages/ui`, `packages/catalog` | 커밋됨 (24bdfe4) |
| 4 | 랜딩을 `apps/portal`로 분리, lotto를 `/games/lotto/` base로 이동 | 커밋됨 (24bdfe4) |
| 5 | 로컬 개발 프록시, Cloudflare Pages용 사이트 조립 | 스테이징됨, 커밋 전 |
| 6 | 한/영 변환기 `apps/ko-en` (`/tools/ko-en/`) | 시작 전 |

1~4단계는 커밋 하나로 묶여 있다.

## 현재 구조

```text
apps/portal/               송이랜드 소개와 도메인 카드 (사이트 루트 /)
apps/lotto/                송이의 행운 로또쇼 (/games/lotto/)
packages/catalog/          도메인 목록, 주소 규칙(domainPath, domainBase), 앱별 포트(appPorts)
packages/a11y/             모션 줄이기, WebGL 지원 감지 훅
packages/ui/               공통 디자인 토큰과 기본 스타일
packages/eslint-config/    공통 ESLint 설정
packages/test-config/      공통 Vitest 설정과 jest-dom setup
scripts/assemble-site.ts   앱별 빌드 결과를 루트 dist/로 조립 (5단계)
tsconfig.base.json         공통 TypeScript 옵션
```

### 포트

| 앱 | dev | preview (e2e) |
| -- | --- | ------------- |
| portal | `http://localhost:5173/` | `http://localhost:4173/` |
| lotto | `http://localhost:5174/games/lotto/` | `http://localhost:4174/games/lotto/` |

5단계부터 포털 서버가 `/games/<id>` 경로를 각 앱 서버로 프록시한다. 그래서 포털 주소
하나로 배포본처럼 돌아다닐 수 있고, HMR 웹소켓도 프록시를 통과한다.

### 배포 산출물 (5단계)

루트 `pnpm build`는 앱별 빌드 뒤 `node scripts/assemble-site.ts`를 실행한다.

```text
dist/                 apps/portal/dist
dist/games/lotto/     apps/lotto/dist
dist/404.html         포털 화면 사본. 없는 주소는 404 상태로 포털을 보여 준다
dist/_headers         해시 자산 장기 캐시, nosniff, Referrer-Policy
```

Pages 설정값은 다음과 같다.

| 항목 | 값 |
| ---- | -- |
| Root directory | `/` |
| Build command | `pnpm build` |
| Build output directory | `dist` |
| 환경 변수 | `NODE_VERSION=22.23.2`, `PNPM_VERSION=11.11.0` |

조립 스크립트는 Node의 TypeScript 직접 실행 기능을 쓰므로 Node 22.18 이상이 필요하다.

## 검증 상태

2026-10-19에 5단계 변경을 포함한 상태에서 에이전트가 아래를 실행했고 모두 통과했다.

| 검사 | 결과 |
| ---- | ---- |
| lint, typecheck | 통과 |
| test | 46건 통과 (catalog 4, portal 3, lotto 39) |
| build + 사이트 조립 | 성공 |
| e2e (Playwright) | 2건 통과 |
| 프록시 수동 확인 | 포털·lotto 페이지 200, lotto 자산 200, HMR 웹소켓 101 |

개발자는 단계마다 아래 검증 체인을 직접 실행해 확인한다.

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm test:e2e
```

## 남은 일

### 5단계 마무리 (개발자)

- 검증 체인을 실행하고 스테이징된 5단계 변경을 커밋한다.
- 경로 기반 단일 Pages 프로젝트로 확정할지 정한다. 서브도메인 방식으로 바꾸려면
  카탈로그에 origin 필드를 두고, 앱마다 Pages 프로젝트를 따로 둔다.

### 6단계: 한/영 변환기

- `apps/ko-en`을 만들고 `/tools/ko-en/`에서 동작하게 한다.
- 카탈로그에 도메인 항목과 포트(예: 5175/4175)를 추가한다. 포털의 "도구" 카드,
  개발 프록시, 사이트 조립은 자동으로 따라온다.
- 변환 범위와 기능은 시작 전에 정한다.
- 새 앱의 의존성을 연결하려면 설치가 한 번 필요하다.

### 계획 밖 후속 작업

- 로또쇼 화면에서 포털로 돌아가는 링크를 추가한다.
- 포털 카드를 눌러 각 앱으로 넘어가는지 확인하는 e2e를 추가한다.
- 첫 Pages 배포에서 다음을 확인한다. `PNPM_VERSION`이 적용되는지,
  `/games/lotto`가 `/games/lotto/`로 리다이렉트되는지, 없는 주소가 404 상태로
  포털을 보여 주는지 본다.

## 알아 둘 점

- pnpm 11은 package.json이 바뀐 뒤 스크립트를 실행하면 설치를 자동으로 수행한다.
  4단계에서 이 동작으로 `pnpm-lock.yaml`에 portal 항목이 추가됐다. 설치를 수동으로만
  하려면 `.npmrc`에 `verify-deps-before-run=error`를 넣는다.
- 저장소는 `~/git/songiland`(WSL 파일시스템)에 있어야 한다. `/mnt/d`에서는 jsdom
  로딩이 느려 Vitest 워커 시작 제한 시간(60초)을 넘겼다.
- e2e를 처음 돌리는 WSL 환경에서는 브라우저 시스템 라이브러리가 필요할 수 있다.

```bash
sudo pnpm --filter lotto exec playwright install-deps chromium
```
