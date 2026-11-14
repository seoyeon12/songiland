import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
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
import { TutorialDone } from '../screens/TutorialDone';
import { currentDepth, readEntry, RESTORABLE, screenFromPath, writeEntry, type Screen } from './history';
import { createBbangStore, type BbangStore, type RecordResult } from './storage';

type Run = { mode: StartMode; shift: Shift; shop: ShopConfig; label: string; day: string };

type Phase =
  | { name: 'start' }
  | { name: 'shop' }
  | { name: 'tutorial'; attempt: number; finished: boolean }
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

function newTutorial(): Phase {
  return { name: 'tutorial', attempt: Date.now(), finished: false };
}

/** 주소·기록 칸으로 열 수 있는 화면. 판 상태가 필요한 화면(장사·결과)은 시작 화면이 된다. */
function restorePhase(screen: Screen | null): Phase {
  if (screen === 'shop') {
    return { name: 'shop' };
  }
  if (screen === 'tutorial') {
    return newTutorial();
  }
  return { name: 'start' };
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
  const [phase, setPhase] = useState<Phase>(() => restorePhase(screenFromPath(window.location.pathname)));

  // 처음 연 화면을 기록의 바닥 칸으로 둔다. 주소로 못 여는 화면(/play·/result)은 시작 화면 주소로 바꾼다.
  useEffect(() => {
    writeEntry(restorePhase(screenFromPath(window.location.pathname)).name, 'replace');
  }, []);

  // 장사 도중이면 뒤로가기를 바로 따르지 않고 그만둘지 묻는다(확인 레이어, 그동안 시계는 멈춤).
  const [quitAsk, setQuitAsk] = useState(false);
  const phaseRef = useRef(phase);
  /** "그만두기"를 골라 기록을 되돌리는 중이면 true: 이번 뒤로가기는 묻지 않고 따른다. */
  const leavingRef = useRef(false);
  // 커밋 직후 바로 맞춘다(useEffect는 늦게 돌 수 있어, 그 틈의 뒤로가기가 장사 중인 줄 모를 수 있다).
  useLayoutEffect(() => {
    phaseRef.current = phase;
  });

  // 뒤로·앞으로가기: 기록 칸의 화면을 연다. 판 상태가 필요한 화면이면 한 칸 더 뒤(시작 화면)로 간다.
  useEffect(() => {
    const onPop = (event: PopStateEvent) => {
      if (phaseRef.current.name === 'play' && !leavingRef.current) {
        // 브라우저는 이미 시작 칸으로 물러났다. 장사 칸을 다시 쌓아 화면·주소를 그대로 두고 묻는다.
        writeEntry('play', 'push');
        setQuitAsk(true);
        return;
      }
      leavingRef.current = false;
      const screen = readEntry(event.state)?.bbang ?? screenFromPath(window.location.pathname) ?? 'start';
      if (RESTORABLE.has(screen)) {
        setPhase(restorePhase(screen));
      } else if (currentDepth() > 0) {
        window.history.back();
      } else {
        writeEntry('start', 'replace');
        setPhase({ name: 'start' });
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // 새로고침·탭 닫기·주소 이동은 페이지가 레이어를 띄울 수 없어 브라우저 기본 확인 창으로만 막을 수 있다.
  const playing = phase.name === 'play';
  useEffect(() => {
    if (!playing) {
      return;
    }
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [playing]);

  const go = (next: Phase, how: 'push' | 'replace') => {
    writeEntry(next.name, how);
    setQuitAsk(false);
    setPhase(next);
  };

  /** 시작 화면으로. 시작 화면 위에 있으면 뒤로가기와 똑같이 기록을 한 칸 되돌린다. */
  const home = useCallback(() => {
    setQuitAsk(false);
    if (currentDepth() > 0) {
      leavingRef.current = true;
      window.history.back();
    } else {
      writeEntry('start', 'replace');
      setPhase({ name: 'start' });
    }
  }, []);

  const updateWallet = (next: Wallet) => {
    store.saveWallet(next);
    setWallet(next);
  };

  /** 장사를 연다. 시작 화면에서는 push, 결과·튜토리얼 화면에서 이어 가면 replace. */
  const play = (mode: StartMode, how: 'push' | 'replace', attempt = 0) => {
    const run = newRun(mode, wallet);
    go({ name: 'play', run, ghost: loadGhost(store, run), attempt }, how);
  };

  if (phase.name === 'tutorial') {
    // 연습 판: 기록·고스트·포인트에 쓰지 않는다. 다 끝내면 판을 그대로 둔 채 완료 안내를 띄운다.
    return (
      <>
        <PlayScreen
          key={phase.attempt}
          shift={TUTORIAL_SHIFT}
          shop={STANDARD_SHOP}
          ghost={null}
          practice
          onQuit={home}
          onEnd={() => {
            store.markTutorialDone();
            setPhase({ ...phase, finished: true });
          }}
        />
        {phase.finished && <TutorialDone onDaily={() => play('daily', 'replace')} onHome={home} />}
      </>
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
        onQuit={() => setQuitAsk(true)}
        quitAsk={
          quitAsk
            ? { daily: run.mode === 'daily', onContinue: () => setQuitAsk(false), onQuit: home }
            : null
        }
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
          go({ name: 'result', run, state, record }, 'replace');
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
        onAgain={() => play(phase.run.mode, 'replace', Date.now())}
        onHome={home}
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
        onBack={home}
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
      onTutorial={() => go(newTutorial(), 'push')}
      onStart={(mode) => play(mode, 'push')}
      onShop={() => go({ name: 'shop' }, 'push')}
    />
  );
}
