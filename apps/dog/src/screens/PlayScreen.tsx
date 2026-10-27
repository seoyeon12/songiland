import { useState } from 'react';
import { useAutoDecide, useOnPageHidden, usePreference, useRunClock, type Speed } from '../app/useRunClock';
import { ChoiceDialog } from '../components/ChoiceDialog';
import { DogPortrait } from '../components/DogPortrait';
import { breedLabel, portraitLabel, whenLabel } from '../components/labels';
import { LifeMap } from '../components/LifeMap';
import { NewcomerDialog } from '../components/NewcomerDialog';
import { PortalLink } from '../components/PortalLink';
import { SiblingCards } from '../components/SiblingCards';
import { StatBars } from '../components/StatBars';
import {
  advanceMonth,
  autoChoose,
  autoWelcome,
  choose,
  formatAge,
  formatMonths,
  josa,
  moodFor,
  MS_PER_MONTH,
  STAGE_LABELS,
  traitLabel,
  welcome,
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
/** 새 식구 카드는 읽을 거리가 많아 조금 더 오래 보여 준다. */
const AUTO_WELCOME_DELAY_MS = 4000;
const RECENT_LOG = 8;
/** "다음 선택지까지" 빨리 감을 때 한 달이 흐르는 시간(ms). 1배속의 50배. */
const RUSH_MS_PER_MONTH = 100;

/**
 * 빨리 감기를 멈추는 순간(선택, 새 식구 이름 짓기, 가족과의 이별)이 지금까지 몇 번 있었는지.
 * 빨리 감기는 이 수가 바뀌기 전까지만 이어진다. 이별 장면은 휙 지나가지 않게 여기서 멈춘다.
 */
function milestones(run: RunState): number {
  return run.log.filter(
    (entry) => entry.kind === 'choice' || entry.kind === 'meet' || entry.kind === 'passed',
  ).length;
}

/** 함께 사는 아이가 여럿이면 선택 카드가 누구 이야기인지 이름을 붙인다. 두 아이 사건은 둘 다. */
function choiceSubject(run: RunState): string | undefined {
  const pending = run.pendingChoice;
  if (!pending || run.dogs.length < 2) {
    return undefined;
  }
  const name = (id: string) => run.dogs.find((entry) => entry.id === id)?.name ?? '';
  return pending.partnerId
    ? `${josa(name(pending.dogId), '과/와')} ${name(pending.partnerId)}`
    : name(pending.dogId);
}

export function PlayScreen({ run, onChange, memoryOnly = false }: PlayScreenProps) {
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = usePreference<Speed>('speed', 1);
  const [autoDecide, setAutoDecide] = usePreference<boolean>('auto-decide', false);
  const [showAllLog, setShowAllLog] = useState(false);
  /** 빨리 감기를 시작한 때의 milestones. 그 뒤로 선택 카드가 뜨거나 이별이 오면 끝난다. */
  const [rushFrom, setRushFrom] = useState<number | null>(null);

  // 판은 첫째와 함께 끝나므로 진행 중에는 첫째가 늘 곁에 있다. 동생들은 아래 작은 카드로 본다.
  const dog = run.dogs[0];
  const pending = run.pendingChoice;
  const newcomer = run.pendingMeeting;
  const running = !paused && run.status === 'running' && !pending && !newcomer;
  const milestoneCount = milestones(run);
  const rushing = running && rushFrom === milestoneCount;

  useRunClock({
    running,
    intervalMs: rushing ? RUSH_MS_PER_MONTH : MS_PER_MONTH / speed,
    onTick: () => onChange(advanceMonth),
  });
  useOnPageHidden(() => {
    setPaused(true);
    setRushFrom(null);
  });
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

        <SiblingCards run={run} />

        <section className="controls" aria-label="진행 조절">
          <button
            type="button"
            className="btn btn--primary"
            aria-pressed={paused}
            onClick={() => {
              setPaused(!paused);
              setRushFrom(null);
            }}
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
                  onChange={() => {
                    setSpeed(value);
                    setRushFrom(null);
                  }}
                />
                <span>{value}배속</span>
              </label>
            ))}
          </fieldset>
          <button
            type="button"
            className="btn rush"
            aria-pressed={rushing}
            onClick={() => {
              if (rushing) {
                setRushFrom(null);
              } else {
                setPaused(false);
                setRushFrom(milestoneCount);
              }
            }}
          >
            <svg className="rush__icon" viewBox="0 0 16 16" aria-hidden>
              <path d="M1 3l7 5-7 5zM8 3l7 5-7 5z" fill="currentColor" />
            </svg>
            다음 선택지까지
          </button>
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
                  {whenLabel(entry.month)}
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

      {newcomer && (
        <NewcomerDialog
          pending={newcomer}
          hostName={run.dogs.find((entry) => entry.id === newcomer.hostId)?.name ?? dog.name}
          taken={run.dogs.map((entry) => entry.name)}
          autoDeciding={autoDecide}
          delayMs={AUTO_WELCOME_DELAY_MS / speed}
          onWelcome={(name) =>
            onChange((current) => (current.pendingMeeting ? welcome(current, name) : current))
          }
          onAuto={() =>
            onChange((current) => (current.pendingMeeting ? autoWelcome(current) : current))
          }
        />
      )}

      {pending && (
        <ChoiceDialog
          pending={pending}
          subject={choiceSubject(run)}
          autoDeciding={autoDecide && !pending.alwaysAsk}
          onChoose={(choiceId) =>
            onChange((current) => (current.pendingChoice ? choose(current, choiceId) : current))
          }
        />
      )}
    </div>
  );
}
