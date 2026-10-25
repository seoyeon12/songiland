# 송이랜드 모노레포 마이그레이션 현황

기준일: 2026-10-25 (처음 작성 2026-10-20)

단일 Vite 앱이던 송이랜드를 pnpm 워크스페이스 모노레포로 옮기는 작업의 진행 상황이다.
도메인(게임·도구)마다 `apps/` 아래 독립 앱을 두고, 공유 코드는 `packages/`에 둔다.

## 확정된 결정

- 도메인마다 앱 하나를 둔다.
- 호스팅은 Cloudflare Pages다. **앱마다 Pages 프로젝트 하나**를 만들고
  `<이름>.arosys.kr` 서브도메인을 붙인다(2026-10-25 확정).
  - 포털: `songiland.arosys.kr`
  - 로또쇼: `lotto.arosys.kr`
- 이에 따라 처음 정했던 경로 규칙(`/games/<id>`, `/tools/<id>`)은 폐기했다. 게임과
  도구의 구분은 포털 카드 분류에만 남는다.
- 한/영 변환기는 예정된 도구 도메인이다. 강화게임은 예시였을 뿐이므로 만들지 않는다.

## 단계별 상태

| 단계 | 내용 | 상태 |
| ---- | ---- | ---- |
| 1 | pnpm 워크스페이스 구성, 기존 앱을 `apps/lotto`로 이동 | 커밋됨 (24bdfe4) |
| 2 | `tsconfig.base.json`, `packages/eslint-config`, `packages/test-config` | 커밋됨 (24bdfe4) |
| 3 | `packages/a11y`, `packages/ui`, `packages/catalog` | 커밋됨 (24bdfe4) |
| 4 | 랜딩을 `apps/portal`로 분리 | 커밋됨 (24bdfe4) |
| 5 | 경로 기반 단일 Pages 구성(개발 프록시, 사이트 조립) | 커밋됨 (6187083), 이후 폐기 |
| 5b | 서브도메인 방식 전환: 앱마다 Pages 프로젝트 | 스테이징됨, 커밋 전 |
| 6 | 한/영 변환기 `apps/ko-en` | 시작 전 |

5b에서 5단계의 개발 프록시와 사이트 조립 스크립트를 제거했다.

## 현재 구조

```text
apps/portal/               송이랜드 소개와 도메인 카드 (songiland.arosys.kr)
apps/lotto/                송이의 행운 로또쇼 (lotto.arosys.kr)
packages/catalog/          도메인 목록, 앱별 서브도메인·포트(appHosts), 앱 주소(appUrl)
packages/a11y/             모션 줄이기 감지 훅 (현재 사용하는 앱 없음)
packages/ui/               공통 디자인 토큰과 기본 스타일
packages/eslint-config/    공통 ESLint 설정
packages/test-config/      공통 Vitest 설정과 jest-dom setup
tsconfig.base.json         공통 TypeScript 옵션
```

모든 앱은 자기 서브도메인의 루트(`/`)에서 동작한다.

| 앱 | 배포 | dev | preview (e2e) |
| -- | ---- | --- | ------------- |
| portal | `https://songiland.arosys.kr/` | `http://localhost:5173/` | `http://localhost:4173/` |
| lotto | `https://lotto.arosys.kr/` | `http://localhost:5174/` | `http://localhost:4174/` |

포털 카드는 dev 서버에서는 localhost 포트로, 빌드 결과에서는 배포 주소로 링크한다.

## 배포 설정

프로젝트별 Pages 설정값은 README의 "배포 (Cloudflare Pages)" 표에 있다. 요점은
다음과 같다.

- Root directory는 저장소 루트(`/`)로 두고, Build command로 한 앱만 빌드한다.
  예: `pnpm --filter lotto build`, 출력 `apps/lotto/dist`.
- Build watch paths로 해당 앱 폴더와 `packages/`만 지켜본다.
- 환경 변수 `NODE_VERSION=22.23.2`, `PNPM_VERSION=11.11.0`.
- 각 앱의 `public/_headers`가 캐시·보안 헤더를 붙인다.
- 앱에 `404.html`이 없으므로 Pages SPA 폴백이 켜진다.

## 검증 상태

2026-10-25에 5b 변경을 포함한 상태에서 에이전트가 아래를 실행했고 모두 통과했다.

| 검사 | 결과 |
| ---- | ---- |
| lint, typecheck | 통과 |
| test | 49건 통과 (catalog 6, portal 4, lotto 39) |
| build | 성공. 두 앱 모두 `/assets/` 기준, `_headers` 포함 |
| e2e (Playwright) | 2건 통과 |

개발자는 단계마다 아래 검증 체인을 직접 실행해 확인한다.

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm test:e2e
```

## 남은 일

### 5b 마무리 (개발자)

- 검증 체인을 실행하고 스테이징된 변경을 커밋한다.
- Cloudflare 대시보드에서 Pages 프로젝트 `songiland`, `lotto`를 만들고 README 표대로
  설정한 뒤 커스텀 도메인을 붙인다.
- 첫 배포에서 확인할 것: Node·pnpm 버전이 적용되는지, 설치 단계가 성공하는지,
  두 주소가 HTTPS로 열리는지, 포털 카드가 `https://lotto.arosys.kr/`로 이어지는지,
  다른 앱만 바뀐 커밋에서 빌드가 건너뛰어지는지.

### 6단계: 한/영 변환기

- `apps/ko-en`을 만든다. 서브도메인 이름은 시작 전에 정한다(예: `ko-en.arosys.kr`).
- 카탈로그 `domains`와 `appHosts`에 항목을 추가한다(포트 예: 5175/4175).
  포털의 "도구" 카드는 자동으로 따라온다.
- Pages 프로젝트를 하나 더 만든다.
- 변환 범위와 기능은 시작 전에 정한다.
- 새 앱의 의존성을 연결하려면 설치가 한 번 필요하다.

### 로또쇼 단순화 (2026-10-25)

- 3D 연출(three.js, React Three Fiber, drei)과 WebGL 감지, 발바닥 모드, 단계별 공개
  상태 기계를 모두 제거했다. Space 또는 버튼 한 번에 7개 번호가 짧은 CSS 등장
  애니메이션과 함께 나온다.
- 상단에 포털(`appUrl('portal')`)로 돌아가는 링크를 추가했다.
- 의존성 제거는 `pnpm install`을 실행해야 잠금 파일에 반영된다.

### 계획 밖 후속 작업

- 포털 카드에서 각 앱으로 넘어가는 흐름을 확인하는 e2e를 추가한다.

## 알아 둘 점

- 앱마다 origin이 달라서 `localStorage`도 앱별로 분리된다. 지금은 앱끼리 공유하는
  저장 데이터가 없으므로 문제없다.
- pnpm 11은 package.json이 바뀐 뒤 스크립트를 실행하면 설치를 자동으로 수행한다.
  설치를 수동으로만 하려면 `.npmrc`에 `verify-deps-before-run=error`를 넣는다.
- 저장소는 `~/git/songiland`(WSL 파일시스템)에 있어야 한다. `/mnt/d`에서는 jsdom
  로딩이 느려 Vitest 워커 시작 제한 시간(60초)을 넘겼다.
- e2e를 처음 돌리는 WSL 환경에서는 브라우저 시스템 라이브러리가 필요할 수 있다.

```bash
sudo pnpm --filter lotto exec playwright install-deps chromium
```
