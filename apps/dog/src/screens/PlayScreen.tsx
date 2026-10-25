import { useState } from 'react';
import { useAutoDecide, useOnPageHidden, usePreference, useRunClock, type Speed } from '../app/useRunClock';
import { ChoiceDialog } from '../components/ChoiceDialog';
import { DogPortrait } from '../components/DogPortrait';
import { breedLabel, portraitLabel } from '../components/labels';
import { LifeMap } from '../components/LifeMap';
import { PortalLink } from '../components/PortalLink';
import { StatBars } from '../components/StatBars';
import {
  advanceMonth,
  autoChoose,
  choose,
  formatAge,
  formatMonths,
  moodFor,
  STAGE_LABELS,
  traitLabel,
  type RunState,
} from '../engine';

/** 언제나 가장 최신 상태에서 다음 상태를 만든다(틱이 몰려도 달을 잃지 않게). */
export type RunUpdate = (update: (run: RunState) => RunState) => void;

export type PlayScreenProps = {
  run: RunState;
  onChange: RunUpdate;
  /** 저장이 막힌 환경이면 안내를 띄운다. */
  memoryOnly?: boolean;
};

const SPEEDS: readonly Speed[] = [1, 2, 4];
const AUTO_DECIDE_DELAY_MS = 2400;
const RECENT_LOG = 8;

export function PlayScreen({ run, onChange, memoryOnly = false }: PlayScreenProps) {
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = usePreference<Speed>('speed', 1);
  const [autoDecide, setAutoDecide] = usePreference<boolean>('auto-decide', false);
  const [showAllLog, setShowAllLog] = useState(false);

  const dog = run.dogs[0];
  const pending = run.pendingChoice;
  const running = !paused && run.status === 'running' && !pending;

  useRunClock({ running, speed, onTick: () => onChange(advanceMonth) });
  useOnPageHidden(() => setPaused(true));
  useAutoDecide({
    active: Boolean(pending) && autoDecide && !pending?.alwaysAsk,
    delayMs: AUTO_DECIDE_DELAY_MS / speed,
    onDecide: () => onChange((current) => (current.pendingChoice ? autoChoose(current) : current)),
  });

  const entries = [...run.log].reverse();
  const shown = showAllLog ? entries : entries.slice(0, RECENT_LOG);

  return (
    <div className="app play">
      <nav className="app__topbar" aria-label="송이랜드">
        <PortalLink />
        <span className="play__clock">함께한 지 {formatMonths(run.month)}</span>
      </nav>

      <main className="app__main">
        <section className="app__card play__hero" aria-labelledby="dog-name">
          <DogPortrait
            className="play__dog"
            breedId={dog.breedId}
            coatId={dog.coatId}
            look={dog.look}
            stage={dog.stage}
            mood={moodFor(dog.stats.happiness)}
            label={portraitLabel(dog, dog.name)}
          />
          <div className="play__who">
            <h1 id="dog-name" className="play__name">
              {dog.name}
            </h1>
            <p className="play__meta">
              {breedLabel(dog)} · {formatAge(dog.ageMonths)} · {STAGE_LABELS[dog.stage]}
            </p>
            <ul className="chips chips--static" aria-label="성격">
              {dog.traits.map((trait) => (
                <li key={trait} className="chip">
                  {traitLabel(trait, dog.sex)}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="controls" aria-label="진행 조절">
          <button
            type="button"
            className="btn btn--primary"
            aria-pressed={paused}
            onClick={() => setPaused(!paused)}
          >
            {paused ? '계속 보기' : '일시정지'}
          </button>
          <fieldset className="segmented">
            <legend className="visually-hidden">속도</legend>
            {SPEEDS.map((value) => (
              <label key={value} className="segmented__option">
                <input
                  type="radio"
                  name="speed"
                  checked={speed === value}
                  onChange={() => setSpeed(value)}
                />
                <span>{value}배속</span>
              </label>
            ))}
          </fieldset>
          <label className="toggle">
            <input
              type="checkbox"
              checked={autoDecide}
              onChange={(event) => setAutoDecide(event.target.checked)}
            />
            <span>자동 결정</span>
          </label>
        </section>

        <section className="app__card" aria-labelledby="stats-title">
          <h2 id="stats-title" className="section-title">
            지금 {dog.name}
          </h2>
          <StatBars stats={dog.stats} ease={run.household.ease} />
        </section>

        <section className="app__card" aria-labelledby="map-title">
          <h2 id="map-title" className="section-title">
            견생 지도
          </h2>
          <LifeMap cells={run.timeline} />
        </section>

        <section className="app__card" aria-labelledby="story-title">
          <h2 id="story-title" className="section-title">
            이야기
          </h2>
          <ol className="story" aria-live="polite">
            {shown.map((entry, index) => (
              <li key={`${entries.length - index}`} className={`story__entry story__entry--${entry.kind}`}>
                <span className="story__when">
                  {entry.month === 0 ? '첫날' : `${formatMonths(entry.month)}째`}
                </span>
                <span className="story__text">
                  {entry.choice && <strong className="story__choice">{entry.choice}</strong>}
                  {entry.text}
                </span>
              </li>
            ))}
          </ol>
          {entries.length > RECENT_LOG && (
            <button type="button" className="btn btn--ghost btn--small" onClick={() => setShowAllLog(!showAllLog)}>
              {showAllLog ? '최근 이야기만 보기' : `지난 이야기 모두 보기 (${entries.length})`}
            </button>
          )}
          {memoryOnly && (
            <p className="play__warning" role="status">
              이 브라우저에서는 저장이 막혀 있어요. 새로 고치면 견생이 사라질 수 있어요.
            </p>
          )}
        </section>
      </main>

      {pending && (
        <ChoiceDialog
          pending={pending}
          autoDeciding={autoDecide && !pending.alwaysAsk}
          onChoose={(choiceId) =>
            onChange((current) => (current.pendingChoice ? choose(current, choiceId) : current))
          }
        />
      )}
    </div>
  );
}
