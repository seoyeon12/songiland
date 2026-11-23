# 붕어빵 랭킹전 온라인 순위표 설계 (6단계)

> 상태: **초안 · 검토 중** · 2026-11-23 · 대상 앱 `apps/bbang` (`bunguppang.arosys.kr`)
>
> [랭킹전 기획서](2026-11-07-bungeoppang-ranking-design.md) 6.2·13장의 "나중 선택지"인 온라인 전역
> 순위표를 구체화한다. 기획서는 저장소로 Worker + D1을 권장했고, 이 문서는 **Supabase(관리형
> Postgres)**를 저장소로 검토한다. 아래 8장의 미정 사항이 정해지면 상태를 "확정"으로 바꾼다.

## 1. 목표와 범위

- "오늘의 장사"(일일 챌린지)에 **날짜별 전역 순위표**를 붙인다. 같은 날 같은 판을 친 사람끼리 겨룬다.
- '내 가게' 모드는 업그레이드에 따라 판이 달라지므로 순위표에 올리지 않는다.
- 로그인 없이 **닉네임만** 받는다(개인정보 최소, 기획서 11장).
- 1차에는 순위 조회, 점수 제출, 내 순위를 만든다. 1등 고스트, 시작 토큰, 닉네임 필터는 2차로 미룬다(6장).

## 2. Supabase를 백엔드에서 쓰는 방식 (배경)

Supabase는 관리형 Postgres에 자동 REST API, Auth, Storage, Edge Functions를 붙인 서비스다.
백엔드·인프라 입장에서는 대체로 "API를 직접 짜지 않아도 되는 Postgres"로 다룬다.

| 영역 | 클라이언트 직결(BaaS형) | 서버 경유형 |
| ---- | ----------------------- | ----------- |
| 접근 | 브라우저가 공개 키(publishable/anon)로 테이블에 바로 접근 | 서버만 비밀 키(secret/service_role)를 들고 DB에 접근 |
| 보안 | **RLS(행 단위 보안) 정책**이 유일한 방어선 | 서버 코드가 검증, RLS로 공개 키는 전부 차단 |
| 로직 | DB 함수(RPC)·트리거 | Edge Functions 또는 외부 서버(Workers 등) |

운영 관행은 이렇다.

- **스키마는 코드로 관리한다**: Supabase CLI로 `supabase/migrations/*.sql`을 git에 두고
  `supabase db push`로 반영한다. `supabase start`(Docker 필요)로 로컬 DB를 띄우고
  `supabase gen types typescript`로 DB 타입을 만든다.
- **환경을 나눈다**: dev와 prod 프로젝트를 따로 두거나 브랜칭을 쓴다. 비밀 키는 배포 환경변수에만 두고 정기적으로 교체한다.
- **게임 점수처럼 위조 동기가 있는 쓰기는 서버 경유가 정석이다.** 클라이언트가 보낸 점수를
  그대로 믿으면 콘솔에서 아무 점수나 보낼 수 있다.

## 3. 핵심 아이디어 — 점수를 받지 않고 입력 로그를 받는다

붕어빵 엔진에는 이미 서버 검증에 필요한 것이 다 있다.

- `engine/shift.ts`: `dailySeed(date)` → `createShift(seed)`. 같은 날이면 누구나 같은 장사다.
- 엔진은 React·DOM·시계에 기대지 않는 순수 TypeScript이고, 시드 난수(mulberry32)를 쓴다.
- `game/replay.ts`: `replay(shift, inputs)`가 입력 로그(`LoggedInput[]`)로 판을 그대로 재현한다(고스트용).
- `game/session.ts`: `RULES_VERSION`(현재 5)이 규칙 버전을 표시한다.

그래서 클라이언트는 **입력 로그만** 보내고, 서버가 `replay()`로 점수를 다시 계산한다. 기획서
6.2는 "완전한 리플레이 재검증은 과하다"고 봤지만, 재현 함수가 이미 있어 추가 비용이 거의 없다.
점수 숫자 위조는 원천 차단된다. 남는 위협은 "사람이 아닌 입력"(봇)이고, 5장 3단계와 6장에서 늦춘다.

## 4. 구조

```text
[브라우저 bunguppang.arosys.kr]
   │  POST /api/runs     { day, rules, inputs, nickname, playerToken }
   │  GET  /api/ranking?day=YYYY-MM-DD
   ▼
[Cloudflare Pages Functions]  (apps/bbang/functions, 같은 도메인이라 CORS 없음)
   ├─ src/engine + src/game/replay.ts를 그대로 import해 재현·채점
   └─ Supabase 비밀 키로 기록 (키는 Pages 환경변수에만)
   ▼
[Supabase Postgres]  RLS 켬, 공개 키로는 읽기·쓰기 모두 불가
```

- **검증은 Supabase Edge Functions가 아닌 Pages Functions에 둔다.** Edge Functions는 Deno 환경이라
  모노레포의 `src/engine`을 가져오기 번거롭다. Pages Functions는 앱 안의 상대 경로 import로 엔진을
  그대로 쓴다. 이미 Cloudflare Pages에 배포하고 있다.
- 브라우저 번들에는 `supabase-js`를 넣지 않는다. 브라우저는 우리 `/api/*`만 안다.
- Supabase는 "DB와 관리 화면" 역할만 한다. 그러므로 저장소만 D1로 바꿔도 같은 구조가 성립한다(7장).

## 5. 데이터와 API

### 5.1 테이블 (초안)

```sql
-- 플레이어: 로그인 없이, 브라우저가 만든 비밀 토큰의 해시로 구분한다.
create table bbang_players (
  id          uuid primary key default gen_random_uuid(),
  token_hash  text not null unique,
  nickname    text not null check (char_length(nickname) between 1 and 12),
  created_at  timestamptz not null default now()
);

-- 날짜별 개인 최고 기록. 한 사람당 하루 한 줄, 더 높을 때만 갱신한다.
create table bbang_daily_best (
  day          date     not null,
  player_id    uuid     not null references bbang_players on delete cascade,
  rules        smallint not null,
  score        int      not null,
  best_streak  int      not null,
  inputs       jsonb    not null,   -- 재검증·고스트용
  inputs_hash  text     not null,   -- 같은 로그 복사 제출 탐지용
  updated_at   timestamptz not null default now(),
  primary key (day, player_id)
);
create index on bbang_daily_best (day, score desc);

alter table bbang_players    enable row level security;
alter table bbang_daily_best enable row level security;
-- 정책을 만들지 않는다 → 공개 키로는 아무것도 못 하고, 비밀 키(서버)만 접근한다.
```

- `playerToken`은 브라우저가 처음에 만든 무작위 값(UUID)이다. `localStorage`에 두고, 서버는 해시만 저장한다.
- 하루 기록 한 줄에는 로그 하나만 남기므로 저장량이 작다(90초 판 입력 로그는 수 KB~수십 KB 수준으로 예상).

### 5.2 API

| 메서드·경로 | 하는 일 |
| ----------- | ------- |
| `GET /api/ranking?day=` | 그날 상위 N명(`nickname, score, best_streak`)을 반환한다. Cloudflare 캐시 30~60초. |
| `POST /api/runs` | 입력 로그를 검증·채점하고, 개인 최고면 기록한다. 응답은 확정 점수와 내 순위다. |

### 5.3 제출 검증 순서

1. `rules === RULES_VERSION`인지 확인한다. 아니면 거부(옛 규칙 로그는 재현할 수 없다).
2. `day`가 서버 기준 오늘인지 확인한다. 날이 바뀐 직후 제출은 몇 분 유예한다.
3. 로그 형태를 검사한다: `atMs`가 증가 순서이고 `0 ≤ atMs ≤ SHIFT_MS(90_000)`, 입력 개수 상한, 입력 사이 최소 간격.
4. `replay(createShift(dailySeed(day)), inputs)`로 점수를 계산한다. **클라이언트가 보낸 점수는 받지 않는다.**
5. 닉네임 길이를 검사하고 공백을 정리한다.
6. 기존 기록보다 높을 때만 `bbang_daily_best`를 upsert한다.

## 6. 2차로 미룰 것

- **시작 토큰**: 시작할 때 서버가 토큰과 시각을 발급하고, 90초가 지나기 전에 들어온 제출은
  거부한다. 미리 계산한 입력을 곧바로 보내는 봇을 늦춘다. HMAC 서명으로 재사용을 막는다.
- **Turnstile·요청 제한**: 기획서 6.2의 최소 조합. Cloudflare Turnstile로 사람인지 확인하고, IP당·토큰당 제출 횟수를 제한한다.
- **닉네임 필터**: 금칙어를 거른다. 문제 닉네임은 관리 화면에서 지운다.
- **1등 고스트**: 1등의 `inputs`를 내려 기존 고스트 기능으로 띄운다.

## 7. 저장소 비교 — Supabase vs D1

| 항목 | Supabase | Cloudflare D1 |
| ---- | -------- | ------------- |
| 외부 의존 | Cloudflare 밖 서비스가 하나 늘어난다 | 지금 쓰는 Cloudflare 안에서 끝난다 |
| 관리 화면·SQL | Postgres, 웹 테이블 편집기, 쿼리 도구가 풍부하다 | SQLite, 대시보드와 wrangler CLI |
| 무료 플랜 주의 | 일정 기간 요청이 없으면 프로젝트가 **일시 정지**되고 백업이 제한적이다 | 정지 없음. 행 읽기·쓰기 일일 한도 |
| 확장 | Auth(익명 로그인)·Realtime으로 키우기 쉽다 | Workers 생태계 안에서 키운다 |
| 이 설계에서 | Pages Functions → HTTPS → Supabase | Pages Functions → D1 바인딩(네트워크 홉 없음) |

4장 구조는 저장소와 무관하다. 저장소 결정은 문서 검토 뒤에 확정한다(8장).

## 8. 미정 사항

- [ ] **저장소**: Supabase vs D1 (7장).
- [ ] **하루 기준 시각**: 지금 `dailyKey`·`dailySeed`는 UTC라서 한국 시간 **오전 9시**에 장사가
      바뀐다. KST 자정으로 바꾸면 시드 계산이 바뀌므로 기존 고스트·로컬 기록 호환을 따져야 한다.
- [ ] **플레이어 구분**: 닉네임 + 브라우저 토큰(기본안) vs Supabase 익명 로그인 vs 정식 로그인.
- [ ] 순위표 표시 인원(상위 50·100)과 지난 날짜 순위 보관 기간.

## 9. 주의점

- **안내 문구**: `app/storage.ts`와 화면에 "기록은 이 브라우저에만, 서버로 보내지 않는다"는 전제가
  있다. 닉네임이 공개되고 기록이 서버로 가므로 화면 안내와 포털 고지를 고친다. 기획서 11장의 법적 검토도 갱신한다.
- **Workers CPU 한도**: 무료 플랜은 요청당 CPU 시간이 짧다(10ms). `replay()`는 입력 시각에만
  계산하므로 충분할 것으로 보지만 **측정 전 추정**이다. 구현 때 최악의 로그로 잰다.
- **비밀 키**: Pages 환경변수(Secret)로만 둔다. 저장소·클라이언트 번들에 넣지 않는다.
- **설치**: Supabase CLI, `wrangler`(Pages Functions 로컬 실행), 필요하면 `@supabase/supabase-js`는
  개발자가 설치한다(AGENTS.md). Supabase는 `fetch`로 REST API를 직접 부를 수도 있어 서버 쪽 패키지 없이도 가능하다.

## 10. 구현 단계 (초안)

| 단계 | 내용 |
| ---- | ---- |
| 6.1 | 마이그레이션 SQL(5.1), RLS, dev 프로젝트 생성. |
| 6.2 | 제출 검증 순수 함수(5.3 1~5단계)와 단위 테스트. 엔진 재현 결과와 점수가 같은지 확인한다. |
| 6.3 | Pages Functions `/api/runs`·`/api/ranking`, 환경변수, 캐시. |
| 6.4 | 화면: 닉네임 입력, 결과 화면 제출·내 순위, 순위표 화면. 오프라인·실패 시 로컬 기록은 그대로 둔다. |
| 6.5 | 안내 문구·법적 검토 갱신, e2e. |
| 6.6 | 2차(6장) 중 필요한 것. |

각 단계가 끝나면 개발자가 검증 명령(typecheck·test·lint·build·e2e)을 실행해 확인한다.

## 11. 참고 문서

- Supabase: Database → Tables, Row Level Security · Local Development & CLI → Migrations ·
  API Keys · JavaScript Reference(`upsert`, `select`/`order`/`range`)
- Cloudflare: Pages Functions · Environment variables · D1 · Turnstile
