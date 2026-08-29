# 송이랜드

보송한 비숑 **송이**가 진행하는 오락용 웹 미니게임 랜드입니다. 첫 게임은
`송이의 행운 로또쇼` — 1~45 중 6개 본번호와 1개 연출용 보너스 번호를 재미로
뽑는 3D 게임쇼입니다.

> 송이랜드의 오락용 번호 추천입니다. 실제 복권 발행·판매·당첨 확인 서비스가
> 아니며, 당첨을 보장하지 않습니다. 복권은 건전하게 즐겨주세요.

## 범위 (첫 출시)

- 공개 라우트는 `/`(소개)와 `/games/lotto`(로또쇼) 둘뿐입니다.
- 무료 서비스이며 결제·상금·포인트·경품·계정·서버 저장·사운드가 없습니다.
- 추첨 결과는 이 브라우저의 `localStorage`에만 최대 24시간·최신 20건 저장되며
  서버로 전송되지 않습니다.
- 상세 경계는 `docs/superpowers/specs/2026-08-26-songiland-lotto-show-design.md`,
  `docs/research/2026-08-26-songiland-lotto-legal-review.md`를 따릅니다.

## 로컬 개발

이 저장소는 **pnpm**을 사용합니다.

```bash
pnpm install                           # 의존성 설치 (최초 1회)
pnpm dlx playwright install chromium   # e2e용 브라우저 (최초 1회)

pnpm dev                               # 개발 서버 (Vite)
pnpm test                              # 단위·컴포넌트 테스트 (Vitest)
pnpm typecheck                         # 타입 검사
pnpm lint                              # ESLint
pnpm build                             # 타입 검사 + 프로덕션 빌드
pnpm test:e2e                          # 브라우저 e2e (Playwright)
```
