import { lazy, Suspense, useEffect, useReducer, useRef, useState } from 'react';
import './components/lotto.css';
import { useReducedMotion, useWebGLSupport } from '@songiland/a11y';
import { EntertainmentNotice } from './components/EntertainmentNotice';
import { GameHud } from './components/GameHud';
import { HistoryPanel } from './components/HistoryPanel';
import { LottoControls } from './components/LottoControls';
import { ResultCard } from './components/ResultCard';
import { drawReducer, initialDrawState } from './domain/drawMachine';
import { createDrawPlan } from './domain/numbers';
import type { DrawPlan, RandomInt } from './domain/types';
import { createHistoryRepository } from './history/historyRepository';
import type { DrawHistoryRepository, DrawRecord } from './history/types';
import { useLottoControls } from './input/useLottoControls';
import { usePawMode } from './input/usePawMode';
import { getMixingCue, getRevealCue } from './scene/revealCue';
import { useRevealTimeline } from './scene/useRevealTimeline';

// Code-split the Three.js stage so the WebGL-fallback path never downloads it.
const LotteryScene = lazy(() =>
  import('./scene/LotteryScene').then((module) => ({
    default: module.LotteryScene,
  })),
);

export type LottoGameProps = {
  /** Test seam only; production uses the Web Crypto generator. */
  random?: RandomInt;
  /** Test seam only; production uses the browser repository. */
  historyRepository?: DrawHistoryRepository;
  /** Test seam only; production uses the WebGL capability hook. */
  webglSupported?: boolean;
};

function newRecordId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `draw-${Date.now()}`;
}

/**
 * Feature controller. It owns the reveal reducer and creates exactly one draw
 * plan per START, drives the mixing/reveal timelines into the reducer, writes a
 * single history record on the transition to `complete`, and restarts to idle
 * without clearing history. The 3D scene is swapped for a semantic 2D stage when
 * WebGL is unavailable — never an error-only dead end.
 */
export function LottoGame({
  random,
  historyRepository,
  webglSupported,
}: LottoGameProps) {
  const detectedWebgl = useWebGLSupport();
  const reducedMotion = useReducedMotion();
  const paw = usePawMode();

  // Stable per-mount instance without touching a ref during render.
  const [repository] = useState<DrawHistoryRepository>(
    () => historyRepository ?? createHistoryRepository(),
  );

  const [state, dispatch] = useReducer(drawReducer, initialDrawState);
  const { phase, plan, revealedCount } = state;

  const [history, setHistory] = useState<DrawRecord[]>(() =>
    repository.list(new Date()),
  );
  const [historyOpen, setHistoryOpen] = useState(false);
  const [completedAt, setCompletedAt] = useState<string>('');

  const usingWebgl = webglSupported ?? detectedWebgl;
  const quality = paw.available ? 'low' : 'high';
  const canAct = phase === 'idle' || phase === 'ready';

  function onPrimaryAction() {
    if (phase === 'idle') {
      dispatch({ type: 'START', plan: createDrawPlan(random) });
    } else if (phase === 'ready') {
      dispatch({ type: 'REQUEST_REVEAL' });
    }
  }

  // Mixing shuffle → ready.
  useRevealTimeline({
    cue: getMixingCue(reducedMotion),
    active: phase === 'mixing',
    onFinished: () => dispatch({ type: 'MIXING_FINISHED' }),
  });

  // Each reveal → next ball; the 7th (revealedCount 6) is the longer bonus cue.
  useRevealTimeline({
    cue: getRevealCue(revealedCount, reducedMotion),
    active: phase === 'revealing',
    onFinished: () => dispatch({ type: 'REVEAL_FINISHED' }),
  });

  // Persist exactly one record when the draw completes. Keyed on plan identity
  // so a StrictMode double-invoke cannot save twice.
  const savedPlanRef = useRef<DrawPlan | null>(null);
  useEffect(() => {
    if (phase !== 'complete' || !plan || savedPlanRef.current === plan) {
      return;
    }
    savedPlanRef.current = plan;
    const now = new Date();
    repository.save(
      {
        id: newRecordId(),
        drawnAt: now.toISOString(),
        mainNumbers: plan.sortedMain,
        bonusNumber: plan.bonus,
      },
      now,
    );
    setCompletedAt(now.toISOString());
    setHistory(repository.list(now));
  }, [phase, plan, repository]);

  const { stageProps } = useLottoControls({
    canAct,
    onPrimaryAction,
    pawMode: paw.pawMode,
  });

  function openHistory() {
    setHistory(repository.list(new Date()));
    setHistoryOpen(true);
  }

  function clearHistory() {
    repository.clear();
    setHistory([]);
  }

  function restart() {
    savedPlanRef.current = null;
    setCompletedAt('');
    dispatch({ type: 'RESET' });
  }

  const isComplete = phase === 'complete' && plan !== null;

  return (
    <main className="lotto-game">
      {usingWebgl ? (
        <Suspense
          fallback={
            <div className="lotto-stage-2d" aria-hidden>
              <span className="lotto-stage-2d__paw">🐾</span>
            </div>
          }
        >
          <LotteryScene
            phase={phase}
            plan={plan}
            revealedCount={revealedCount}
            quality={quality}
            reducedMotion={reducedMotion}
            onStageActivate={onPrimaryAction}
            stageProps={stageProps}
          />
        </Suspense>
      ) : (
        <div
          className="lotto-stage-2d"
          data-testid="lotto-stage"
          role="application"
          aria-label="송이의 행운 로또쇼 무대 (2D 대체 화면)"
          tabIndex={0}
          {...stageProps}
        >
          <span aria-hidden className="lotto-stage-2d__paw">
            🐾
          </span>
        </div>
      )}

      <div className="lotto-game__panel">
        <GameHud phase={phase} plan={plan} revealedCount={revealedCount} />

        {isComplete ? (
          <ResultCard
            mainNumbers={plan.sortedMain}
            bonusNumber={plan.bonus}
            drawnAt={completedAt}
            onRestart={restart}
            onOpenHistory={openHistory}
          />
        ) : (
          <>
            <LottoControls
              phase={phase}
              revealedCount={revealedCount}
              onPrimaryAction={onPrimaryAction}
              pawAvailable={paw.available}
              pawEnabled={paw.enabled}
              onTogglePaw={paw.setEnabled}
            />
            <EntertainmentNotice />
            <button
              type="button"
              className="btn btn--ghost"
              onClick={openHistory}
              data-lotto-control
            >
              최근 행운 기록 보기
            </button>
          </>
        )}

        {repository.persistence === 'memory' && (
          <p className="lotto-game__storage-warning" role="status">
            이 기기에서는 기록이 유지되지 않을 수 있어요.
          </p>
        )}
      </div>

      <HistoryPanel
        isOpen={historyOpen}
        records={history}
        onClose={() => setHistoryOpen(false)}
        onClear={clearHistory}
      />
    </main>
  );
}
