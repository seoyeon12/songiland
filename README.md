# 송이랜드

보송한 비숑 **송이**가 진행하는 오락용 웹 미니게임 랜드입니다. 첫 게임은
`송이의 행운 로또쇼` — 스페이스바나 버튼 한 번에 1~45 중 6개 본번호와 1개
연출용 보너스 번호를 재미로 골라 주는 번호 추천입니다.

> 송이랜드의 오락용 번호 추천입니다. 실제 복권 발행·판매·당첨 확인 서비스가
> 아니며, 당첨을 보장하지 않습니다. 복권은 건전하게 즐겨주세요.

## 범위 (첫 출시)

- 공개 주소는 `https://songiland.arosys.kr/`(소개), `https://lotto.arosys.kr/`(로또쇼),
  `https://ko-en.arosys.kr/`(한영타 변환기), `https://dog.arosys.kr/`(견생극장) 네 곳입니다.
  각각 별도 앱(`apps/portal`, `apps/lotto`, `apps/ko-en`, `apps/dog`)이 맡습니다.
- 한영타 변환기는 입력한 글자를 브라우저 안에서만 바꾸며 저장하거나 전송하지
  않습니다.
- 견생극장은 진행 중인 판과 지난 견생(최근 10편)을 이 브라우저의 `localStorage`에만
  저장합니다. 공유 카드 이미지도 브라우저 안에서 그리며 서버로 보내지 않습니다.
  기획은 `docs/specs/2026-10-25-dog-life-sim-design.md`를 따릅니다.
- 무료 서비스이며 결제·상금·포인트·경품·계정·서버 저장·사운드가 없습니다.
- 추첨 결과는 이 브라우저의 `localStorage`에만 최대 24시간·최신 20건 저장되며
  서버로 전송되지 않습니다.
- 상세 경계는 `docs/superpowers/specs/2026-08-26-songiland-lotto-show-design.md`,
  `docs/research/2026-08-26-songiland-lotto-legal-review.md`를 따릅니다.

## 로컬 개발

이 저장소는 **pnpm 워크스페이스** 모노레포입니다. 도메인별 앱은 `apps/*`,
공유 코드는 `packages/*`에 둡니다.

```text
apps/portal/               송이랜드 소개·도메인 목록 (songiland.arosys.kr)
apps/lotto/                송이의 행운 로또쇼 (lotto.arosys.kr)
apps/ko-en/                한영타 변환기 (ko-en.arosys.kr)
apps/dog/                  견생극장 (dog.arosys.kr)
packages/catalog/          도메인 목록, 앱별 서브도메인·포트, 앱 주소 appUrl (@songiland/catalog)
packages/ui/               공통 디자인 시스템: 색 토큰, 앱 레이아웃, 버튼 (@songiland/ui/base.css)
packages/eslint-config/    공통 ESLint 설정 (@songiland/eslint-config)
packages/test-config/      공통 Vitest 설정·jest-dom setup (@songiland/test-config)
tsconfig.base.json         공통 TypeScript 컴파일 옵션 (각 앱이 extends)
```

루트 스크립트는 모든 워크스페이스 패키지에 같은 명령을 실행합니다.

```bash
pnpm install                                       # 의존성 설치 (최초 1회)
pnpm --filter lotto exec playwright install chromium  # e2e용 브라우저 (최초 1회)

pnpm dev                               # 모든 앱 개발 서버 동시 실행 (포털 http://localhost:5173/)
pnpm --filter lotto dev                # 한 앱만 실행
pnpm test                              # 단위·컴포넌트 테스트 (Vitest)
pnpm typecheck                         # 타입 검사
pnpm lint                              # ESLint
pnpm build                             # 앱별 타입 검사·빌드 → apps/<앱>/dist
pnpm preview                           # 빌드 결과를 앱별 preview 서버로 실행
pnpm test:e2e                          # 브라우저 e2e (Playwright)
```

특정 앱만 실행하려면 `pnpm --filter <앱 이름> <스크립트>`를 사용합니다.

`pnpm-workspace.yaml`에 `verifyDepsBeforeRun: error`가 있어서, package.json을 바꾼 뒤에는
`pnpm install`을 먼저 실행해야 다른 pnpm 스크립트가 돌아갑니다. pnpm이 스크립트를
실행하면서 몰래 설치하는 일은 없습니다.

### 앱 주소와 로컬 포트

모든 앱은 자기 서브도메인의 루트(`/`)에서 동작합니다. 로컬에서도 앱마다 자기 포트로
따로 뜹니다.

| 앱     | 배포                           | dev                      | preview (e2e)            |
| ------ | ------------------------------ | ------------------------ | ------------------------ |
| portal | `https://songiland.arosys.kr/` | `http://localhost:5173/` | `http://localhost:4173/` |
| lotto  | `https://lotto.arosys.kr/`     | `http://localhost:5174/` | `http://localhost:4174/` |
| ko-en  | `https://ko-en.arosys.kr/`     | `http://localhost:5175/` | `http://localhost:4175/` |
| dog    | `https://dog.arosys.kr/`       | `http://localhost:5176/` | `http://localhost:4176/` |

서브도메인과 포트는 `@songiland/catalog`의 `appHosts`가 정하고, `appUrl`이 앱 주소를
만듭니다. 포털 카드는 dev 서버에서는 localhost 포트로, 빌드 결과에서는 배포 주소로
링크합니다. 그래서 `pnpm preview`로 띄운 포털의 카드는 배포된 사이트로 이어집니다.

새 도메인 앱을 붙일 때는 카탈로그의 `domains`와 `appHosts`에 항목을 추가하고 앱 폴더를
`apps/<id>`로 만듭니다. 포털 카드는 자동으로 따라오고, Cloudflare Pages 프로젝트는
아래 설정대로 하나 더 만듭니다.

## 배포 (Cloudflare Pages)

**앱마다 Pages 프로젝트 하나**를 만들고 서브도메인을 붙입니다. 모든 프로젝트가 이
저장소에 Git으로 연결되며, 저장소 루트에서 의존성을 설치한 뒤 한 앱만 빌드합니다.
앱들이 `packages/`의 공유 코드와 루트 `pnpm-lock.yaml`을 쓰기 때문입니다.

모든 프로젝트에 공통인 설정입니다.

| 항목              | 값                                             |
| ----------------- | ---------------------------------------------- |
| Production branch | `main`                                         |
| Framework preset  | None                                           |
| Root directory    | `/` (저장소 루트)                              |
| 환경 변수         | `NODE_VERSION=22.23.4`, `PNPM_VERSION=11.11.0` |

프로젝트마다 다른 설정입니다. Build watch paths에는 표의 앱 폴더와 함께 공통으로
`packages/*`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `tsconfig.base.json`을 넣습니다.

| Pages 프로젝트 | Build command                | Build output       | Watch path(앱) | Custom domain         |
| -------------- | ---------------------------- | ------------------ | -------------- | --------------------- |
| `songiland`    | `pnpm --filter portal build` | `apps/portal/dist` | `apps/portal/*` | `songiland.arosys.kr` |
| `lotto`        | `pnpm --filter lotto build`  | `apps/lotto/dist`  | `apps/lotto/*`  | `lotto.arosys.kr`     |
| `ko-en`        | `pnpm --filter ko-en build`  | `apps/ko-en/dist`  | `apps/ko-en/*`  | `ko-en.arosys.kr`     |
| `dog`          | `pnpm --filter dog build`    | `apps/dog/dist`    | `apps/dog/*`    | `dog.arosys.kr`       |

- Build watch paths를 지정하면 다른 앱만 바뀐 커밋에서는 이 프로젝트가 다시 빌드되지
  않습니다.
- 각 앱의 `public/_headers`가 빌드 결과에 복사되어 해시 자산 장기 캐시와
  nosniff·Referrer-Policy 헤더를 붙입니다.
- 앱에 `404.html`이 없으므로 Pages가 SPA 폴백을 켭니다. 없는 경로로 들어와도 그 앱의
  index.html을 받아 같은 화면이 열립니다.
- Custom domain은 프로젝트의 Custom domains 탭에서 추가합니다. arosys.kr DNS가
  Cloudflare에 있으면 CNAME 레코드가 자동으로 생기고 HTTPS 인증서도 자동 발급됩니다.

첫 배포 때는 빌드 로그에서 Node·pnpm 버전과 설치 단계를 확인하고, 각 주소가 열리는지,
포털 카드와 각 앱의 `← 송이랜드` 링크가 서로 이어지는지 확인합니다.

## 릴리스 검증

### 자동 검증 (한 번에 실행)

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm test:e2e
git diff --check
git status --short
```

모든 명령이 통과하고 의도한 변경만 남아 있어야 합니다.

### 수동 검증 체크리스트

- **기능** — 데스크톱: Space 한 번과 `번호 뽑기` 클릭 한 번에 각각 7개 번호가 모두
  나오고 기록이 1건씩 쌓이는지, 버튼·링크에 포커스가 있거나 기록 패널이 열려 있을 때
  Space로 뽑히지 않는지, `← 송이랜드` 링크가 포털로 가는지 확인. 모바일 에뮬레이션:
  버튼 탭으로 뽑히는지, Space 안내가 숨겨지는지, 기록 서랍이 바텀시트로 뜨는지 확인.
- **한영타 변환기** — `dkssudgktpdy`가 `안녕하세요`로, `한글`이 `gksrmf`로
  자동 변환되는지, 방향을 직접 고르면 그 방향으로만 바뀌는지, 결과 복사와 지우기가
  동작하는지, 네트워크 탭에 입력 내용을 보내는 요청이 없는지 확인.
- **견생극장** — 만나러 가기 → 이름 짓기 → 진행 화면이 이어지는지, 새로 고쳐도 `이어 보기`로
  돌아오는지, 4배속·자동 결정으로 결말 카드까지 가는지, `이미지로 저장`이 PNG를 내려받는지,
  휴대폰에서 `공유`가 공유 시트를 여는지, 끝난 판이 시작 화면 `지난 견생`에 남는지 확인.
- **비기능** — 320px 화면에서도 공 7개가 한 줄에 들어가는지, OS `모션 줄이기`를
  켜면 공 등장 애니메이션이 꺼지는지, 사운드/오디오 요청이 전혀 없는지 확인.
- **법적·데이터 경계** — DOM·자산·의존성·네트워크 탭에 공식 복권 로고/영상,
  구매 링크, 결제 UI, 상금·포인트·순위, 분석 SDK, 외부 API 호출, 서버 저장이
  없는지, 오락용 고지와 6본번호 고지가 필요한 상태에서 보이는지 확인.
- 상세 기준: `docs/research/2026-08-26-songiland-lotto-legal-review.md`의 출시 전
  체크리스트.
