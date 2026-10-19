# 송이랜드

보송한 비숑 **송이**가 진행하는 오락용 웹 미니게임 랜드입니다. 첫 게임은
`송이의 행운 로또쇼` — 1~45 중 6개 본번호와 1개 연출용 보너스 번호를 재미로
뽑는 3D 게임쇼입니다.

> 송이랜드의 오락용 번호 추천입니다. 실제 복권 발행·판매·당첨 확인 서비스가
> 아니며, 당첨을 보장하지 않습니다. 복권은 건전하게 즐겨주세요.

## 범위 (첫 출시)

- 공개 라우트는 `/`(소개)와 `/games/lotto`(로또쇼) 둘뿐입니다. 각각 별도 앱
  (`apps/portal`, `apps/lotto`)이 맡습니다.
- 무료 서비스이며 결제·상금·포인트·경품·계정·서버 저장·사운드가 없습니다.
- 추첨 결과는 이 브라우저의 `localStorage`에만 최대 24시간·최신 20건 저장되며
  서버로 전송되지 않습니다.
- 상세 경계는 `docs/superpowers/specs/2026-08-26-songiland-lotto-show-design.md`,
  `docs/research/2026-08-26-songiland-lotto-legal-review.md`를 따릅니다.

## 로컬 개발

이 저장소는 **pnpm 워크스페이스** 모노레포입니다. 도메인별 앱은 `apps/*`,
공유 코드는 `packages/*`에 둡니다.

```text
apps/portal/               송이랜드 소개·도메인 목록 (사이트 루트 `/`)
apps/lotto/                송이의 행운 로또쇼 (`/games/lotto/` base)
packages/a11y/             접근성 훅: 모션 줄이기·WebGL 지원 감지 (@songiland/a11y)
packages/catalog/          도메인 목록과 URL 규칙 /games/<id>, /tools/<id> (@songiland/catalog)
packages/ui/               공통 디자인 토큰·기본 스타일 (@songiland/ui/base.css)
packages/eslint-config/    공통 ESLint 설정 (@songiland/eslint-config)
packages/test-config/      공통 Vitest 설정·jest-dom setup (@songiland/test-config)
tsconfig.base.json         공통 TypeScript 컴파일 옵션 (각 앱이 extends)
```

루트 스크립트는 모든 워크스페이스 패키지에 같은 명령을 실행합니다. 포트는 앱마다
하나씩 비켜 씁니다.

| 앱     | dev                                   | preview (e2e)                         |
| ------ | ------------------------------------- | ------------------------------------- |
| portal | `http://localhost:5173/`              | `http://localhost:4173/`              |
| lotto  | `http://localhost:5174/games/lotto/`  | `http://localhost:4174/games/lotto/`  |

도메인 앱의 base(`/games/<id>/`)는 `@songiland/catalog`의 `domainPath`에서 가져오고,
라우터 basename은 `import.meta.env.BASE_URL`로 같은 값을 읽습니다. 개발 서버가
앱마다 따로 뜨는 동안에는 포털의 `/games/lotto` 링크가 다른 포트의 앱으로 이어지지
않습니다. 한 origin으로 묶는 개발 프록시와 배포 구성은 다음 단계에서 다룹니다.

```bash
pnpm install                                       # 의존성 설치 (최초 1회)
pnpm --filter lotto exec playwright install chromium  # e2e용 브라우저 (최초 1회)

pnpm dev                               # 모든 앱 개발 서버를 동시에 실행 (Vite)
pnpm --filter lotto dev                # 한 앱만 실행
pnpm test                              # 단위·컴포넌트 테스트 (Vitest)
pnpm typecheck                         # 타입 검사
pnpm lint                              # ESLint
pnpm build                             # 타입 검사 + 프로덕션 빌드
pnpm test:e2e                          # 브라우저 e2e (Playwright)
```

특정 앱만 실행하려면 `pnpm --filter <앱 이름> <스크립트>`를 사용합니다.

## 릴리스 검증

### 자동 검증 (한 번에 실행)

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm test:e2e
git diff --check
git status --short
```

모든 명령이 통과하고 의도한 변경만 남아 있어야 합니다.

### 수동 검증 체크리스트

- **기능** — 데스크톱: 마우스로 시작, Space로 공개, 기록 패널에 포커스가 있을
  때 Space가 무시되는지, 7개 공개 후 기록 1건 저장 확인. 모바일 에뮬레이션:
  발바닥 모드 ON 후 빈 무대를 탭해 진행, 기록 서랍이 바텀시트로 뜨는지 확인.
- **비기능** — OS `모션 줄이기`를 켜면 카메라 이동 대신 짧은 컷을 쓰는지, WebGL을
  차단하면 2D 흐름이 동작하는지, 320px~와이드 뷰포트, 사운드/오디오 요청이 전혀
  없는지 확인.
- **법적·데이터 경계** — DOM·자산·의존성·네트워크 탭에 공식 복권 로고/영상,
  구매 링크, 결제 UI, 상금·포인트·순위, 분석 SDK, 외부 API 호출, 서버 저장이
  없는지, 오락용 고지와 6본번호 고지가 필요한 상태에서 보이는지 확인.
- 상세 기준: `docs/research/2026-08-26-songiland-lotto-legal-review.md`의 출시 전
  체크리스트.
