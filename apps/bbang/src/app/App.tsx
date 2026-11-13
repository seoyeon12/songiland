import { useState } from 'react';
import {
  createShift,
  dailyKey,
  dailySeed,
  earn,
  purchase,
  shopConfig,
  STANDARD_SHOP,
  type Shift,
  type ShopConfig,
  type Wallet,
} from '../engine';
import { replay, scoreTimeline, type ScorePoint } from '../game/replay';
import { RULES_VERSION, type SessionState } from '../game/session';
import { TUTORIAL_SHIFT } from '../game/tutorial';
import { PlayScreen } from '../screens/PlayScreen';
import { ResultScreen } from '../screens/ResultScreen';
import { ShopScreen } from '../screens/ShopScreen';
import { StartScreen, type StartMode } from '../screens/StartScreen';
import { createBbangStore, type BbangStore, type RecordResult } from './storage';

type Run = { mode: StartMode; shift: Shift; shop: ShopConfig; label: string; day: string };

type Phase =
  | { name: 'start'; tutorialFinished?: boolean }
  | { name: 'shop' }
  | { name: 'tutorial' }
  | { name: 'play'; run: Run; ghost: ScorePoint[] | null; attempt: number }
  | { name: 'result'; run: Run; state: SessionState; record: RecordResult };

/** 저장된 고스트를 오늘 장사에 다시 돌려 보고, 점수가 그대로 나올 때만 쓴다(규칙·데이터 어긋남 방지). */
function loadGhost(store: BbangStore, run: Run): ScorePoint[] | null {
  if (run.mode !== 'daily') {
    return null;
  }
  const ghost = store.ghost(run.day, RULES_VERSION);
  if (!ghost || ghost.seed !== run.shift.seed) {
    return null;
  }
  try {
    if (replay(run.shift, ghost.inputs).tally.score !== ghost.score) {
      return null;
    }
    return scoreTimeline(run.shift, ghost.inputs);
  } catch {
    return null;
  }
}

/** 오늘의 장사는 날짜 시드 + 표준 가게, 내 가게는 무작위 시드 + 업그레이드 반영 가게. */
function newRun(mode: StartMode, wallet: Wallet): Run {
  const now = new Date();
  const day = dailyKey(now);
  if (mode === 'daily') {
    return {
      mode,
      day,
      shift: createShift(dailySeed(now)),
      shop: STANDARD_SHOP,
      label: `오늘의 장사 · ${day}`,
    };
  }
  return {
    mode,
    day,
    shift: createShift(Math.floor(Math.random() * 0xffffffff)),
    shop: shopConfig(wallet.upgrades),
    label: '내 가게',
  };
}

export function App({ store: injected }: { store?: BbangStore } = {}) {
  const [store] = useState(() => injected ?? createBbangStore());
  const [wallet, setWallet] = useState<Wallet>(() => store.wallet());
  const [phase, setPhase] = useState<Phase>({ name: 'start' });

  const updateWallet = (next: Wallet) => {
    store.saveWallet(next);
    setWallet(next);
  };

  const play = (mode: StartMode, attempt = 0) => {
    const run = newRun(mode, wallet);
    setPhase({ name: 'play', run, ghost: loadGhost(store, run), attempt });
  };

  if (phase.name === 'tutorial') {
    // 연습 판: 기록·고스트·포인트에 쓰지 않고, 끝나면 시작 화면으로 돌아간다.
    return (
      <PlayScreen
        shift={TUTORIAL_SHIFT}
        shop={STANDARD_SHOP}
        ghost={null}
        practice
        onQuit={() => setPhase({ name: 'start' })}
        onEnd={() => {
          store.markTutorialDone();
          setPhase({ name: 'start', tutorialFinished: true });
        }}
      />
    );
  }
  if (phase.name === 'play') {
    const { run } = phase;
    return (
      <PlayScreen
        key={phase.attempt}
        shift={run.shift}
        shop={run.shop}
        ghost={phase.ghost}
        onEnd={(state) => {
          const record =
            run.mode === 'daily'
              ? store.recordDaily({
                  day: run.day,
                  seed: run.shift.seed,
                  rules: RULES_VERSION,
                  score: state.tally.score,
                  bestStreak: state.tally.bestStreak,
                  inputs: state.inputs,
                })
              : store.recordOwn(state.tally.score);
          // 다른 탭에서 바뀌었을 수 있으니 저장된 지갑에 더한다.
          updateWallet(earn(store.wallet(), state.revenue, state.cost));
          setPhase({ name: 'result', run, state, record });
        }}
      />
    );
  }
  if (phase.name === 'result') {
    return (
      <ResultScreen
        state={phase.state}
        mode={phase.run.mode}
        day={phase.run.day}
        label={phase.run.label}
        record={phase.record}
        points={wallet.points}
        onAgain={() => play(phase.run.mode, Date.now())}
        onHome={() => setPhase({ name: 'start' })}
      />
    );
  }
  if (phase.name === 'shop') {
    return (
      <ShopScreen
        wallet={wallet}
        onBuy={(id) => {
          const next = purchase(store.wallet(), id);
          if (next) {
            updateWallet(next);
          }
        }}
        onBack={() => setPhase({ name: 'start' })}
      />
    );
  }

  const day = dailyKey(new Date());
  return (
    <StartScreen
      day={day}
      dailyBest={store.dailyBest(day)}
      ownBest={store.ownBest()}
      points={wallet.points}
      persistence={store.persistence}
      tutorialDone={store.tutorialDone()}
      tutorialFinished={phase.tutorialFinished ?? false}
      onTutorial={() => setPhase({ name: 'tutorial' })}
      onStart={(mode) => play(mode)}
      onShop={() => setPhase({ name: 'shop' })}
    />
  );
}
