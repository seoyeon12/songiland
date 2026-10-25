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
  - 한영타 변환기: `ko-en.arosys.kr`
- 처음 정했던 경로 규칙(`/games/<id>`, `/tools/<id>`)은 폐기했다. 게임과 도구의
  구분은 포털 카드 분류에만 남는다.
- 로또쇼는 3D 연출 없이 스페이스바나 클릭 한 번에 번호를 뽑는 단순한 화면으로 간다
  (2026-10-25).
- 한영타 변환기는 두벌식 자판 기준으로 양방향 변환하고 방향은 자동 감지한다
  (2026-10-25). 강화게임은 예시였을 뿐이므로 만들지 않는다.

## 진행 이력

| 단계 | 내용 | 커밋 |
| ---- | ---- | ---- |
| 1–4 | pnpm 워크스페이스, `apps/lotto` 이동, 공통 설정·패키지, `apps/portal` 분리 | 24bdfe4 |
| 5 | 경로 기반 단일 Pages 구성(개발 프록시, 사이트 조립). 이후 폐기 | 6187083 |
| 5b | 서브도메인 방식 전환: 앱마다 Pages 프로젝트 | e8da819 |
| — | 로또쇼 단순화: 3D·WebGL·발바닥 모드·단계별 공개 제거, 포털 링크 추가 | 6dca716, 4e4ceae |
| — | 정리: `packages/a11y`와 로또 앱 라우터 제거, 자동 설치 금지 설정, 옛 설계 문서 보관 표시 | 89ec286 |
| 6 | 한영타 변환기 `apps/ko-en` (`ko-en.arosys.kr`) | 커밋 전 |

## 현재 구조

```text
apps/portal/               송이랜드 소개와 도메인 카드 (songiland.arosys.kr)
apps/lotto/                송이의 행운 로또쇼 (lotto.arosys.kr)
apps/ko-en/                한영타 변환기 (ko-en.arosys.kr)
packages/catalog/          도메인 목록, 앱별 서브도메인·포트(appHosts), 앱 주소(appUrl)
packages/ui/               공통 디자인 토큰과 기본 스타일
packages/eslint-config/    공통 ESLint 설정
packages/test-config/      공통 Vitest 설정과 jest-dom setup
tsconfig.base.json         공통 TypeScript 옵션
pnpm-workspace.yaml        워크스페이스 범위와 자동 설치 금지(verifyDepsBeforeRun: error)
```

모든 앱이 화면 하나뿐이라 라우터 없이 React만 쓴다. 모든 앱은 자기 서브도메인의
루트(`/`)에서 동작한다.

| 앱 | 배포 | dev | preview (e2e) |
| -- | ---- | --- | ------------- |
| portal | `https://songiland.arosys.kr/` | `http://localhost:5173/` | `http://localhost:4173/` |
| lotto | `https://lotto.arosys.kr/` | `http://localhost:5174/` | `http://localhost:4174/` |
| ko-en | `https://ko-en.arosys.kr/` | `http://localhost:5175/` | `http://localhost:4175/` |

포털 카드와 각 앱의 `← 송이랜드` 링크는 dev 서버에서는 localhost 포트로, 빌드
결과에서는 배포 주소로 이어진다.

## 로또쇼 화면

- Space 또는 `번호 뽑기` 버튼 한 번에 본번호 6개(오름차순)와 보너스 1개가 나온다.
  공은 짧은 CSS 애니메이션으로 차례로 나타나고, OS 모션 줄이기 설정에서는 바로 보인다.
- 버튼·링크에 포커스가 있거나 기록 패널이 열려 있으면 Space로 뽑히지 않는다.
- 뽑을 때마다 기록이 1건 저장된다(이 브라우저에만, 최대 24시간·20건).
- 오락용 고지와 6본번호 고지는 법적 검토대로 화면에 유지한다.

## 한영타 변환기

- 한/영 키를 잘못 누른 채 친 글자를 두벌식 자판 기준으로 되돌린다. 예: `dkssud` ↔ `안녕`.
- 방향은 자동 감지(한글이 영문 글자보다 많으면 한→영)이며 직접 고를 수도 있다.
- 겹모음·겹받침, 받침이 다음 글자 초성으로 넘어가는 경우, Shift 쌍자음과 ㅒ·ㅖ를
  처리한다. 그 밖의 대문자는 소문자로 본다(Caps Lock).
- 숫자·기호·공백 등은 그대로 둔다. 입력은 저장·전송하지 않는다.
- 결과 복사(클립보드)와 지우기 버튼이 있다.

## 배포 설정

프로젝트별 Pages 설정값은 README의 "배포 (Cloudflare Pages)" 표에 있다. 요점은
다음과 같다.

- Root directory는 저장소 루트(`/`)로 두고, Build command로 한 앱만 빌드한다.
  예: `pnpm --filter lotto build`, 출력 `apps/lotto/dist`.
- Build watch paths로 해당 앱 폴더와 `packages/`만 지켜본다.
- 환경 변수 `NODE_VERSION=22.23.2`, `PNPM_VERSION=11.11.0`.
- 각 앱의 `public/_headers`가 캐시·보안 헤더를 붙인다.
- 앱에 `404.html`이 없으므로 Pages SPA 폴백이 켜진다.

## 남은 일

### 배포 (개발자)

- Cloudflare 대시보드에서 Pages 프로젝트 `songiland`, `lotto`, `ko-en`을 README 표대로
  만들고 커스텀 도메인을 붙인다.
- 첫 배포에서 확인할 것: Node·pnpm 버전이 적용되는지, 설치 단계가 성공하는지,
  세 주소가 HTTPS로 열리는지, 포털과 각 앱 사이 링크가 서로 이어지는지, 다른 앱만
  바뀐 커밋에서 빌드가 건너뛰어지는지.

### 공개 전 확인

- 법적 검토 문서의 출시 전 체크리스트에 따라, 공개·수익화 전에 실제 빌드 기준으로
  게임물 등급분류 대상 여부를 전문가에게 확인한다. 3D 상호작용을 뺐으므로 지금 화면
  기준으로 확인받는다.
- README의 수동 검증 체크리스트를 새 화면 기준으로 실행한다.

## 알아 둘 점

- `pnpm-workspace.yaml`의 `verifyDepsBeforeRun: error` 때문에 package.json을 바꾼 뒤에는
  `pnpm install`을 먼저 해야 다른 pnpm 스크립트가 실행된다. 자동 설치는 일어나지 않는다.
  pnpm 11은 이 설정을 `.npmrc`에서 읽지 않는다.
- 앱마다 origin이 달라서 `localStorage`도 앱별로 분리된다. 지금은 앱끼리 공유하는
  저장 데이터가 없으므로 문제없다.
- 저장소는 `~/git/songiland`(WSL 파일시스템)에 있어야 한다. `/mnt/d`에서는 jsdom
  로딩이 느려 Vitest 워커 시작 제한 시간(60초)을 넘겼다.
- e2e를 처음 돌리는 WSL 환경에서는 브라우저 시스템 라이브러리가 필요할 수 있다.

```bash
sudo pnpm --filter lotto exec playwright install-deps chromium
```
