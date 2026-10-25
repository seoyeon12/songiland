# Songiland Lotto Show Implementation Plan

> **ARCHIVED — do not execute (marked 2026-10-25).** This plan built the first release
> as a 3D show with React Three Fiber, a step-by-step reveal, paw mode, and the
> `/games/lotto` route. All of that has since been removed: the lotto app is a one-press
> draw served at `lotto.arosys.kr`. See `README.md` and
> `docs/migration/2026-10-20-monorepo-migration-status.md` for the current structure.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Songiland’s first web mini-game: a free, accessible 3D lotto-show number recommender that reveals six main numbers and one show bonus number.

**Architecture:** A small React application exposes a minimal landing route and an isolated `/games/lotto` feature. The feature generates all seven numbers from Web Crypto before animation, uses a reducer to reveal them one at a time, renders the show with React Three Fiber, and persists only the last 24 hours of draws in browser storage.

**Tech Stack:** Vite, React, TypeScript, React Router, Three.js, React Three Fiber, React Three Drei, Vitest, React Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-26-songiland-lotto-show-design.md`

## Global Constraints

- The only public routes in this release are `/` and `/games/lotto`; `/` contains only Songiland’s introduction and one route to the lotto show.
- Use 1–45 with no duplicates to create six main numbers and one bonus number. The bonus number is show-only; the purchase-number UI contains exactly six main numbers.
- Generate the complete draw before any animation using `crypto.getRandomValues()`; Three.js physics, timing, and input method must never influence the result.
- Support mouse click and Space on desktop. On mobile, `발바닥 모드 ON` makes taps on empty stage space reveal one next ball.
- Store no accounts, analytics, server data, external API data, or personally identifying data. Keep valid draws in `songiland:lotto:draws:v1` for 24 hours and cap them at 20.
- Do not add payment, prizes, points, ranking, sharing, official lottery branding, purchase links, actual-result checking, BGM, or sound effects.
- Do not create a realistic Songi model until the owner has supplied photo references and separately approved that work.
- Always display the approved entertainment-only notice, the six-main-number rule, and a no-WebGL fallback.

---

## File Structure

| Path | Responsibility |
| --- | --- |
| `src/app/App.tsx` | Route table for the minimal landing page and lotto page |
| `src/pages/LandingPage.tsx` | Songiland’s first-game gateway |
| `src/features/lotto/domain/` | Pure number generation, types, and draw-state reducer |
| `src/features/lotto/history/` | 24-hour, 20-record storage repository and memory fallback |
| `src/features/lotto/components/` | Accessible HUD, result card, history drawer, notices, controls |
| `src/features/lotto/scene/` | Three.js-only scene, machine, balls, animation cues, quality profile |
| `src/features/lotto/LottoGame.tsx` | Feature controller joining domain, storage, UI, and scene |
| `src/shared/accessibility/` | Reduced-motion and WebGL capability hooks |
| `src/styles/` | Global tokens, responsive layout, and component styles |
| `tests/e2e/lotto-show.spec.ts` | Browser-level desktop and mobile critical journeys |
| `THIRD_PARTY_NOTICES.md` | License notices for every shipped dependency and asset |

## Task 1: Create the React application shell and routes

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`
- Create: `src/main.tsx`, `src/app/App.tsx`, `src/pages/LandingPage.tsx`, `src/styles/global.css`, `playwright.config.ts`
- Create: `src/app/App.test.tsx`, `src/test/setup.ts`
- Create: `README.md` sections for local development and scope

**Interfaces:**
- Produces: `App(): JSX.Element`, with `/` and `/games/lotto` route elements.
- Produces: `LandingPage(): JSX.Element`, which links to `/games/lotto`.
- Consumes later: `LottoGame` from `src/features/lotto/LottoGame.tsx`.

- [ ] **Step 1: Install the minimal runtime and test dependencies**

Run:

```bash
npm install react react-dom react-router-dom three @react-three/fiber @react-three/drei
npm install -D typescript vite @vitejs/plugin-react vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @playwright/test eslint prettier
npx playwright install chromium
```

- [ ] **Step 2: Write the failing route test**

Create `src/app/App.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { App } from './App';

it('links the Songiland gateway to the first lotto game', () => {
  render(<MemoryRouter initialEntries={['/']}><App /></MemoryRouter>);
  expect(screen.getByRole('heading', { name: '송이랜드' })).toBeVisible();
  expect(screen.getByRole('link', { name: '첫 번째 게임: 송이의 행운 로또쇼' }))
    .toHaveAttribute('href', '/games/lotto');
});
```

- [ ] **Step 3: Run the test and confirm it fails because the application is absent**

Run: `npm run test -- src/app/App.test.tsx`

Expected: FAIL because `./App` and the test script do not exist yet.

- [ ] **Step 4: Add the smallest routed shell that makes the test pass**

Create the route contract in `src/app/App.tsx`:

```tsx
import { Route, Routes } from 'react-router-dom';
import { LottoGame } from '../features/lotto/LottoGame';
import { LandingPage } from '../pages/LandingPage';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/games/lotto" element={<LottoGame />} />
    </Routes>
  );
}
```

Create `LandingPage` with one heading and one link only; create a temporary `LottoGame` heading so the import resolves. Configure these scripts in `package.json` before running the tests:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "lint": "eslint .",
    "test:e2e": "playwright test"
  }
}
```

Configure Vitest with `jsdom` and load `@testing-library/jest-dom` in `src/test/setup.ts`.

- [ ] **Step 5: Run the focused test and TypeScript check**

Run:

```bash
npm run test -- src/app/App.test.tsx
npm run typecheck
```

Expected: PASS; `/` has no game catalogue, account, or additional game card.

- [ ] **Step 6: Commit the shell**

```bash
git add package.json package-lock.json vite.config.ts tsconfig.json index.html src README.md
git commit -m "feat: scaffold Songiland lotto routes"
```

## Task 2: Implement fair draw generation and reveal-state reducer

**Files:**
- Create: `src/features/lotto/domain/types.ts`
- Create: `src/features/lotto/domain/numbers.ts`
- Create: `src/features/lotto/domain/drawMachine.ts`
- Test: `src/features/lotto/domain/numbers.test.ts`
- Test: `src/features/lotto/domain/drawMachine.test.ts`

**Interfaces:**
- Produces: `createDrawPlan(random?: RandomInt): DrawPlan`.
- Produces: `drawReducer(state: DrawState, event: DrawEvent): DrawState`.
- Consumes later: `DrawPlan`, `DrawState`, and `DrawPhase` in `LottoGame`, controls, and the Three.js scene.

- [ ] **Step 1: Write failing number-generation tests**

Create `numbers.test.ts`:

```ts
import { createDrawPlan } from './numbers';

it('creates six main numbers and a different bonus number in the 1..45 range', () => {
  const draw = createDrawPlan(() => 0);
  expect(draw.main).toHaveLength(6);
  expect(draw.revealOrder).toHaveLength(7);
  expect(new Set(draw.revealOrder).size).toBe(7);
  expect(draw.revealOrder.every((number) => number >= 1 && number <= 45)).toBe(true);
  expect(draw.main).not.toContain(draw.bonus);
});

it('returns sorted main numbers without changing their reveal order', () => {
  const draw = createDrawPlan((limit) => limit - 1);
  expect(draw.sortedMain).toEqual([...draw.main].sort((a, b) => a - b));
  expect(draw.revealOrder.slice(0, 6)).toEqual(draw.main);
});
```

- [ ] **Step 2: Run the number tests and confirm they fail**

Run: `npm run test -- src/features/lotto/domain/numbers.test.ts`

Expected: FAIL because `createDrawPlan` does not exist.

- [ ] **Step 3: Implement a Web Crypto-backed Fisher–Yates draw**

Create these exact public types in `types.ts`:

```ts
export type RandomInt = (upperExclusive: number) => number;

export type DrawPlan = {
  main: [number, number, number, number, number, number];
  bonus: number;
  revealOrder: [number, number, number, number, number, number, number];
  sortedMain: [number, number, number, number, number, number];
};
```

In `numbers.ts`, make `cryptoRandomInt(upperExclusive)` sample with rejection to avoid modulo bias; let `createDrawPlan` shuffle integers 1 through 45, take seven distinct values, then build the tuple fields above. Do not import Three.js or read the current time in this module.

- [ ] **Step 4: Write the failing reducer test**

Create `drawMachine.test.ts`:

```ts
import { initialDrawState, drawReducer } from './drawMachine';
import type { DrawPlan } from './types';

const plan: DrawPlan = {
  main: [4, 8, 15, 16, 23, 42],
  bonus: 7,
  revealOrder: [4, 8, 15, 16, 23, 42, 7],
  sortedMain: [4, 8, 15, 16, 23, 42],
};

it('permits exactly one completed reveal at a time and completes after the bonus', () => {
  let state = drawReducer(initialDrawState, { type: 'START', plan });
  expect(state.phase).toBe('mixing');
  state = drawReducer(state, { type: 'MIXING_FINISHED' });
  state = drawReducer(state, { type: 'REQUEST_REVEAL' });
  expect(state.phase).toBe('revealing');
  expect(drawReducer(state, { type: 'REQUEST_REVEAL' })).toEqual(state);
  state = drawReducer(state, { type: 'REVEAL_FINISHED' });
  expect(state.revealedCount).toBe(1);
});
```

- [ ] **Step 5: Implement the reducer state contract**

Implement these state names exactly: `idle`, `mixing`, `ready`, `revealing`, `complete`. `START` accepts a complete `DrawPlan`; `MIXING_FINISHED` enters `ready`; `REQUEST_REVEAL` enters `revealing` only from `ready`; `REVEAL_FINISHED` increments `revealedCount` and returns to `ready` until all seven values have finished, then enters `complete`. Ignore events that are invalid for the current phase.

- [ ] **Step 6: Run all domain tests**

Run: `npm run test -- src/features/lotto/domain`

Expected: PASS with all number-range, uniqueness, ordering, and input-lock assertions green.

- [ ] **Step 7: Commit the domain layer**

```bash
git add src/features/lotto/domain
git commit -m "feat: add lotto draw domain"
```

## Task 3: Add expiring browser history with a memory fallback

**Files:**
- Create: `src/features/lotto/history/types.ts`
- Create: `src/features/lotto/history/historyRepository.ts`
- Test: `src/features/lotto/history/historyRepository.test.ts`

**Interfaces:**
- Consumes: `DrawPlan` from `domain/types.ts`.
- Produces: `createHistoryRepository(storage?: Storage): DrawHistoryRepository`.
- Produces: `DrawRecord` with `id`, `drawnAt`, `mainNumbers`, and `bonusNumber`.

- [ ] **Step 1: Write failing storage tests**

```ts
import { createHistoryRepository } from './historyRepository';

const now = new Date('2026-08-26T12:00:00.000Z');

it('prunes records older than 24 hours and retains only the newest 20', () => {
  const repository = createHistoryRepository(window.localStorage);
  for (let index = 0; index < 21; index += 1) {
    repository.save({ id: String(index), drawnAt: new Date(now.getTime() - index * 60_000).toISOString(), mainNumbers: [1, 2, 3, 4, 5, 6], bonusNumber: 7 }, now);
  }
  repository.save({ id: 'expired', drawnAt: new Date(now.getTime() - 24 * 60 * 60 * 1000 - 1).toISOString(), mainNumbers: [8, 9, 10, 11, 12, 13], bonusNumber: 14 }, now);
  expect(repository.list(now)).toHaveLength(20);
  expect(repository.list(now).some((record) => record.id === 'expired')).toBe(false);
});
```

- [ ] **Step 2: Run the storage test and confirm it fails**

Run: `npm run test -- src/features/lotto/history/historyRepository.test.ts`

Expected: FAIL because the repository module is absent.

- [ ] **Step 3: Implement the repository without server access**

Use `const HISTORY_KEY = 'songiland:lotto:draws:v1'`, `const RETENTION_MS = 86_400_000`, and `const MAX_RECORDS = 20`. `list(now)` must parse defensively, discard malformed and expired entries, sort newest first, write the normalized list back, and return it. `save(record, now)` must save the new record then normalize; `clear()` removes only that key.

Expose the same API with an in-memory array when `localStorage` throws during either reading or writing:

```ts
export type DrawHistoryRepository = {
  list(now: Date): DrawRecord[];
  save(record: DrawRecord, now: Date): DrawRecord[];
  clear(): void;
  persistence: 'local' | 'memory';
};
```

- [ ] **Step 4: Add a failing fallback test, then implement it**

```ts
it('falls back to memory when storage access throws', () => {
  const throwingStorage = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); }, removeItem: () => { throw new Error('blocked'); } } as unknown as Storage;
  expect(createHistoryRepository(throwingStorage).persistence).toBe('memory');
});
```

Make the test pass without logging the draw data or sending it anywhere.

- [ ] **Step 5: Run the history test suite**

Run: `npm run test -- src/features/lotto/history`

Expected: PASS; a record exactly 24 hours old remains only if it has not passed the 24-hour boundary.

- [ ] **Step 6: Commit history persistence**

```bash
git add src/features/lotto/history
git commit -m "feat: persist recent lotto draws locally"
```

## Task 4: Build the accessible game HUD, result card, and history panel

**Files:**
- Create: `src/features/lotto/components/GameHud.tsx`
- Create: `src/features/lotto/components/ResultCard.tsx`
- Create: `src/features/lotto/components/HistoryPanel.tsx`
- Create: `src/features/lotto/components/EntertainmentNotice.tsx`
- Create: `src/features/lotto/components/LottoControls.tsx`
- Create: `src/features/lotto/components/lotto.css`
- Test: `src/features/lotto/components/ResultCard.test.tsx`
- Test: `src/features/lotto/components/HistoryPanel.test.tsx`

**Interfaces:**
- Consumes: `DrawState`, `DrawPlan`, and `DrawRecord`.
- Produces: semantic controls that call `onStart`, `onReveal`, `onRestart`, `onOpenHistory`, `onClearHistory`, and `onSetPawMode`.
- Produces: no source of random numbers and no storage side effects inside presentational components.

- [ ] **Step 1: Write the failing result-card test**

```tsx
it('shows six sorted purchase numbers and labels the bonus as show-only', () => {
  render(<ResultCard mainNumbers={[42, 4, 23, 8, 16, 15]} bonusNumber={7} drawnAt="2026-08-26T12:00:00.000Z" onRestart={() => {}} onOpenHistory={() => {}} />);
  expect(screen.getByText('오늘의 송이 픽!')).toBeVisible();
  expect(screen.getByText('4')).toBeVisible();
  expect(screen.getByText('보너스 번호는 게임쇼 연출이에요. 실제 구매 번호는 본번호 6개뿐!')).toBeVisible();
  expect(screen.getByRole('button', { name: '한 번 더 뽑기' })).toBeEnabled();
});
```

- [ ] **Step 2: Run the component test and confirm it fails**

Run: `npm run test -- src/features/lotto/components/ResultCard.test.tsx`

Expected: FAIL because `ResultCard` does not exist.

- [ ] **Step 3: Implement the exact approved UI copy**

`GameHud` renders the title `송이의 행운 로또쇼`, six main slots, one distinct bonus slot, and state-sensitive copy. Each revealed slot has `aria-label="공개된 본번호 {1~6}"`; the bonus slot has `aria-label="공개된 보너스 번호"`. `LottoControls` renders `🐾 송이의 행운 발도장` in `idle`, `다음 공 뽑기 · Space` in `ready`, and `보너스 공 뽑기 · Space` before the seventh reveal. It must use real `<button>` elements.

`ResultCard` sorts only its display copy of the six supplied main numbers, renders a visually distinct purple bonus ball, the two approved buttons, draw time, and the exact six-number notice. `EntertainmentNotice` renders the approved entertainment-only sentence verbatim.

- [ ] **Step 4: Write a failing history-panel interaction test**

```tsx
it('confirms before clearing the recent 24-hour history', async () => {
  const user = userEvent.setup();
  const onClear = vi.fn();
  render(<HistoryPanel isOpen records={[record]} onClose={() => {}} onClear={onClear} />);
  await user.click(screen.getByRole('button', { name: '기록 모두 지우기' }));
  expect(screen.getByRole('dialog', { name: '기록을 모두 지울까요?' })).toBeVisible();
  await user.click(screen.getByRole('button', { name: '지우기' }));
  expect(onClear).toHaveBeenCalledOnce();
});
```

- [ ] **Step 5: Implement responsive records and empty states**

`HistoryPanel` shows `최근 24시간의 행운 기록 · n/20`, displays newest records first, and uses `송이와 첫 번째 행운번호를 뽑아볼까?` when empty. Style it as a right drawer at `min-width: 768px` and a bottom sheet below that breakpoint. It must trap neither focus nor scrolling while closed; opening moves focus to its heading and closing returns focus to the opener.

- [ ] **Step 6: Run component tests**

Run: `npm run test -- src/features/lotto/components`

Expected: PASS; the UI exposes the approved copy and never displays seven purchase-number balls.

- [ ] **Step 7: Commit the UI components**

```bash
git add src/features/lotto/components
git commit -m "feat: add lotto show interface"
```

## Task 5: Create the Three.js stage and quality profiles

**Files:**
- Create: `src/features/lotto/scene/sceneTypes.ts`
- Create: `src/features/lotto/scene/sceneProfile.ts`
- Create: `src/features/lotto/scene/LotteryScene.tsx`
- Create: `src/features/lotto/scene/BallMachine.tsx`
- Create: `src/features/lotto/scene/LottoBall.tsx`
- Test: `src/features/lotto/scene/sceneProfile.test.ts`

**Interfaces:**
- Consumes: `DrawPhase`, `DrawPlan | null`, `revealedCount`, `reducedMotion`, `quality`, and `onStageActivate`.
- Produces: `LotteryScene(props: LotterySceneProps): JSX.Element` and `getSceneProfile(quality, reducedMotion): SceneProfile`.
- Produces: a visual-only scene; it must not generate numbers, write history, or decide state transitions.

- [ ] **Step 1: Write failing quality-profile tests**

```ts
it('removes nonessential visual load for low quality and reduced motion', () => {
  expect(getSceneProfile('low', false)).toMatchObject({ backgroundBallCount: 18, shadows: false });
  expect(getSceneProfile('high', true).cameraMotion).toBe('cut');
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npm run test -- src/features/lotto/scene/sceneProfile.test.ts`

Expected: FAIL because the scene profile module does not exist.

- [ ] **Step 3: Implement original Songiland stage geometry**

Create a transparent spherical chamber on a plush circular base, a lighting arch, a transparent upward tube, and a front reveal frame. Render 45 numbered, Songiland-colored balls inside the chamber at high quality; render 18 at low quality. Do not copy the official lottery ball color system, machine shape, broadcast graphics, logos, or footage.

Use the following prop contract:

```ts
export type LotterySceneProps = {
  phase: DrawPhase;
  plan: DrawPlan | null;
  revealedCount: number;
  quality: 'high' | 'low';
  reducedMotion: boolean;
  onStageActivate: () => void;
};
```

- [ ] **Step 4: Add a non-WebGL fallback before mounting Canvas**

Create `src/shared/accessibility/useWebGLSupport.ts` that returns `false` when a canvas cannot create either `webgl2` or `webgl` context. In `LottoGame`, replace the Canvas with a semantic 2D stage that preserves the same controls, slots, notices, and history. It must not show an error-only dead end.

- [ ] **Step 5: Run scene profile tests and build**

Run:

```bash
npm run test -- src/features/lotto/scene/sceneProfile.test.ts
npm run build
```

Expected: PASS; the build contains no audio assets or external data fetches.

- [ ] **Step 6: Commit the scene foundation**

```bash
git add src/features/lotto/scene src/shared/accessibility
git commit -m "feat: add 3d lotto machine stage"
```

## Task 6: Animate the show without affecting the draw result

**Files:**
- Create: `src/features/lotto/scene/revealCue.ts`
- Create: `src/features/lotto/scene/useRevealTimeline.ts`
- Modify: `src/features/lotto/scene/LotteryScene.tsx`
- Test: `src/features/lotto/scene/revealCue.test.ts`
- Test: `src/features/lotto/scene/useRevealTimeline.test.tsx`

**Interfaces:**
- Consumes: `DrawState` and `DrawPlan` from Task 2.
- Produces: `getRevealCue(revealedCount: number, reducedMotion: boolean): RevealCue`.
- Produces: `onMixingFinished()` and `onRevealFinished()` callbacks exactly once per animation cycle.

- [ ] **Step 1: Write failing cue tests**

```ts
it('uses the special bonus cue only for the seventh ball', () => {
  expect(getRevealCue(5, false).kind).toBe('main');
  expect(getRevealCue(6, false)).toMatchObject({ kind: 'bonus', frame: 'gold', light: 'violet' });
});

it('uses cuts instead of camera travel when motion is reduced', () => {
  expect(getRevealCue(0, true).camera).toBe('cut');
});
```

- [ ] **Step 2: Run the cue tests and confirm they fail**

Run: `npm run test -- src/features/lotto/scene/revealCue.test.ts`

Expected: FAIL because no cue function exists.

- [ ] **Step 3: Implement the approved timings**

Implement a 2,400 ms mixing cue after `START`. For each of the first six reveals, animate the predetermined number from chamber to tube to front frame for 1,200 ms. After the sixth ball, darken the stage and leave a gold frame; animate the seventh with violet lighting and a longer 1,500 ms cue. Use this hook contract:

```ts
export function useRevealTimeline(options: {
  cue: RevealCue | null;
  active: boolean;
  onFinished: () => void;
}): void;
```

`useRevealTimeline` calls its completion callback once even if React re-renders during an animation; cleanup all timers and `requestAnimationFrame` work on unmount.

- [ ] **Step 4: Add and run the fake-timer completion test**

```tsx
it('calls onRevealFinished once after the configured duration', () => {
  vi.useFakeTimers();
  const onRevealFinished = vi.fn();
  renderHook(() => useRevealTimeline({ cue: mainCue, active: true, onFinished: onRevealFinished }));
  vi.advanceTimersByTime(1_200);
  expect(onRevealFinished).toHaveBeenCalledOnce();
});
```

Run: `npm run test -- src/features/lotto/scene`

Expected: PASS; the sequence animation reveals supplied numbers only.

- [ ] **Step 5: Commit the reveal timeline**

```bash
git add src/features/lotto/scene
git commit -m "feat: animate lotto ball reveals"
```

## Task 7: Connect desktop, keyboard, and paw-mode input safely

**Files:**
- Create: `src/features/lotto/input/useLottoControls.ts`
- Create: `src/features/lotto/input/usePawMode.ts`
- Modify: `src/features/lotto/components/LottoControls.tsx`
- Modify: `src/features/lotto/scene/LotteryScene.tsx`
- Test: `src/features/lotto/input/useLottoControls.test.tsx`

**Interfaces:**
- Consumes: `canStart`, `canReveal`, and `onPrimaryAction` from `LottoGame`.
- Produces: `stageProps`, `pawMode`, `setPawMode`, and `onPrimaryAction`.
- Must never invoke `onPrimaryAction` from Space while a button, dialog, input, link, or history panel contains focus.

- [ ] **Step 1: Write the failing keyboard and tap tests**

```tsx
function ControlHarness({ canAct, onPrimaryAction, pawMode = false }: {
  canAct: boolean;
  onPrimaryAction: () => void;
  pawMode?: boolean;
}) {
  const controls = useLottoControls({ canAct, onPrimaryAction, pawMode });
  return (
    <section data-testid="lotto-stage" tabIndex={0} {...controls.stageProps}>
      <button data-lotto-control type="button">기록 모두 지우기</button>
    </section>
  );
}

it('uses Space once on an active stage and prevents scrolling', () => {
  const onPrimaryAction = vi.fn();
  render(<ControlHarness canAct onPrimaryAction={onPrimaryAction} />);
  fireEvent.keyDown(screen.getByTestId('lotto-stage'), { key: ' ' });
  expect(onPrimaryAction).toHaveBeenCalledOnce();
});

it('does not reveal when Space comes from the history clear button', () => {
  const onPrimaryAction = vi.fn();
  render(<ControlHarness canAct onPrimaryAction={onPrimaryAction} />);
  fireEvent.keyDown(screen.getByRole('button', { name: '기록 모두 지우기' }), { key: ' ' });
  expect(onPrimaryAction).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run the input test and confirm it fails**

Run: `npm run test -- src/features/lotto/input/useLottoControls.test.tsx`

Expected: FAIL because the hooks do not exist.

- [ ] **Step 3: Implement a single primary-action path**

`useLottoControls` must send stage clicks and eligible Space presses to one callback only when the reducer is in `idle` or `ready`. It must call `preventDefault()` for an eligible Space press only.

`usePawMode` is available only at the mobile breakpoint. When it is on and the phase is `ready`, a pointer-up on empty stage space calls the same primary callback. Controls, drawers, dialogs, and links are excluded using a `data-lotto-control` ancestor check. The hook ignores pointer-up events during the 1-second reducer/timeline lock.

- [ ] **Step 4: Add a failing paw-mode test, then make it pass**

```tsx
it('reveals one ball for an empty-stage touch only when paw mode is on', () => {
  const onPrimaryAction = vi.fn();
  render(<ControlHarness canAct onPrimaryAction={onPrimaryAction} pawMode />);
  fireEvent.pointerUp(screen.getByTestId('lotto-stage'), { pointerType: 'touch' });
  expect(onPrimaryAction).toHaveBeenCalledOnce();
});
```

- [ ] **Step 5: Run the full input suite**

Run: `npm run test -- src/features/lotto/input`

Expected: PASS; click, Space, and paw touch share one state transition and no input can skip a ball.

- [ ] **Step 6: Commit input support**

```bash
git add src/features/lotto/input src/features/lotto/components src/features/lotto/scene
git commit -m "feat: add keyboard and paw lotto controls"
```

## Task 8: Integrate the complete game and legal copy

**Files:**
- Modify: `src/features/lotto/LottoGame.tsx`
- Modify: `src/features/lotto/components/EntertainmentNotice.tsx`
- Create: `THIRD_PARTY_NOTICES.md`
- Test: `src/features/lotto/LottoGame.test.tsx`
- Test: `tests/e2e/lotto-show.spec.ts`

**Interfaces:**
- Consumes: all domain, history, scene, component, and input contracts from Tasks 2–7.
- Produces: a complete `LottoGame` page that saves exactly one record only after seven reveals complete.

- [ ] **Step 1: Write the failing end-to-end feature test**

```tsx
async function completeDraw(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: '🐾 송이의 행운 발도장' }));
  await act(async () => { vi.advanceTimersByTime(2_400); });
  for (let index = 0; index < 7; index += 1) {
    await user.click(screen.getByRole('button', {
      name: index === 6 ? '보너스 공 뽑기 · Space' : '다음 공 뽑기 · Space',
    }));
    await act(async () => { vi.advanceTimersByTime(index === 6 ? 1_500 : 1_200); });
  }
}

it('saves a completed draw once and exposes the entertainment-only result', async () => {
  vi.useFakeTimers();
  const blockedStorage = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); }, removeItem: () => { throw new Error('blocked'); } } as unknown as Storage;
  const memoryRepository = createHistoryRepository(blockedStorage);
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  render(<LottoGame random={() => 0} historyRepository={memoryRepository} webglSupported={false} />);
  await completeDraw(user);
  expect(screen.getByText('오늘의 송이 픽!')).toBeVisible();
  expect(memoryRepository.list(new Date())).toHaveLength(1);
  expect(screen.getByText(/실제 복권 발행·판매·당첨 확인 서비스가 아니며/)).toBeVisible();
});
```

- [ ] **Step 2: Run the integration test and confirm it fails**

Run: `npm run test -- src/features/lotto/LottoGame.test.tsx`

Expected: FAIL because the temporary page does not implement the game controller.

- [ ] **Step 3: Implement the feature controller**

`LottoGame` owns the reducer and creates one draw plan only on `START`. It sends timeline completions into the reducer, writes a `DrawRecord` once on the transition to `complete`, refreshes history after every save and panel opening, and makes restart reset to `idle` without clearing history. Inject `random`, `historyRepository`, and `webglSupported` optional props only for tests; production uses the Web Crypto generator, the browser repository, and the WebGL hook.

Display the storage warning exactly when `historyRepository.persistence === 'memory'`:

> 이 기기에서는 기록이 유지되지 않을 수 있어요.

Put this exact privacy notice in the history panel:

> 추천 기록은 이 브라우저에만 최대 24시간 저장되며 송이랜드 서버로 전송되지 않습니다. 브라우저 데이터 삭제·시크릿 모드·다른 기기에서는 기록이 유지되지 않을 수 있습니다.

- [ ] **Step 4: Add browser tests for desktop and mobile paths**

Create `tests/e2e/lotto-show.spec.ts`:

```ts
test('desktop Space reveals a number without scrolling the page', async ({ page }) => {
  await page.goto('/games/lotto');
  await page.getByRole('button', { name: '🐾 송이의 행운 발도장' }).click();
  await page.waitForTimeout(2400);
  await page.keyboard.press('Space');
  await page.waitForTimeout(1200);
  await expect(page.getByLabel('공개된 본번호 1')).toBeVisible();
});

test('mobile paw mode advances only from empty stage space', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/games/lotto');
  await page.getByRole('button', { name: '발바닥 모드 ON' }).click();
  await page.getByTestId('lotto-stage').tap({ position: { x: 30, y: 120 } });
  await page.waitForTimeout(2400);
  await page.getByTestId('lotto-stage').tap({ position: { x: 30, y: 120 } });
  await page.waitForTimeout(1200);
  await expect(page.getByLabel('공개된 본번호 1')).toBeVisible();
});
```

- [ ] **Step 5: Add third-party notices and run all checks**

List the exact installed versions and license texts or URLs for React, React Router, Three.js, React Three Fiber, React Three Drei, and any additional shipped package in `THIRD_PARTY_NOTICES.md`. Do not list BGM or sound assets because none may ship.

Run:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

Expected: PASS; the network inspector shows no data collection request made by the game itself.

- [ ] **Step 6: Commit the complete first game**

```bash
git add src tests THIRD_PARTY_NOTICES.md package.json package-lock.json
git commit -m "feat: launch Songiland lotto show"
```

## Task 9: Perform release verification against the approved scope

**Files:**
- Modify: `README.md` with local verification commands
- Modify: `docs/research/2026-08-26-songiland-lotto-legal-review.md` only if the built product differs from the approved facts

**Interfaces:**
- Consumes: the built site and every completed test suite.
- Produces: evidence that the implemented release matches the approved spec and legal limits.

- [ ] **Step 1: Verify functional acceptance criteria manually**

On desktop, start a draw with a mouse, reveal with Space, verify that focus in the history panel blocks Space, finish seven reveals, and confirm one stored record. On mobile emulation, enable paw mode, tap empty stage space seven times with animation waits, then confirm the history drawer becomes a bottom sheet.

- [ ] **Step 2: Verify nonfunctional acceptance criteria manually**

Turn on the operating-system reduced-motion preference and confirm that the show uses short cuts rather than camera travel. Block WebGL and confirm the full 2D flow works. Test a narrow 320 px viewport and a wide desktop viewport. Confirm no sound plays or audio requests occur.

- [ ] **Step 3: Verify legal and data boundaries**

Inspect the final DOM, source assets, dependency list, and network requests. Confirm there are no official lottery logos, official video/images, purchase links, payment UI, prizes, points, rankings, analytics SDKs, external API calls, or server-side draw storage. Confirm the entertainment notice and six-main-number notice are visible at the required states.

- [ ] **Step 4: Run the final automated verification**

Run:

```bash
npm run lint && npm run typecheck && npm run test && npm run build && npm run test:e2e
git diff --check
git status --short
```

Expected: all commands pass; only intentional release changes are present.

- [ ] **Step 5: Commit verification documentation**

```bash
git add README.md docs/research/2026-08-26-songiland-lotto-legal-review.md
git commit -m "docs: record lotto show verification"
```

## Plan Self-Review

- **Spec coverage:** Task 1 covers the minimal root gateway; Tasks 2, 5, and 6 cover precomputed 6+1 draws and 3D show timing; Task 7 covers all three input paths; Tasks 3, 4, and 8 cover 24-hour, 20-record local history and all approved copy; Tasks 5 and 9 cover reduced motion, mobile quality, and WebGL fallback; Task 8 and 9 cover no-data/no-audio/no-branding constraints and license notices.
- **Scope:** This plan deliberately excludes Songi photo-modeling, a full game hub, accounts, sound, sharing, monetization, and every real-money or real-lottery integration.
- **Type consistency:** `DrawPlan`, `DrawState`, `DrawRecord`, and `DrawHistoryRepository` are defined before later tasks consume them. The primary action remains the single transition used by click, Space, and paw touch.
- **Placeholder scan:** No deferred implementation markers are used; all proposed files, public interfaces, test names, commands, and verification outcomes are specified.
