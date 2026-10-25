import { useState } from 'react';
import {
  advanceUntilChoice,
  choose,
  formatAge,
  formatMonths,
  getBreed,
  getCoat,
  previewMeeting,
  ROUTE_LABELS,
  simulateToEnd,
  STAGE_LABELS,
  startRun,
  stageFor,
  summarize,
  traitLabel,
  type RunState,
  type StatKey,
} from '../engine';
import './preview.css';

function randomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0];
}

const STAT_LABELS: Record<StatKey, string> = {
  health: '건강',
  happiness: '행복',
  bond: '유대',
  sociability: '사회성',
};

/**
 * 1·2단계 엔진 미리보기. 선택 카드마다 멈추며 진행하거나, 끝까지 자동으로 돌려 본다.
 * 3단계에서 실제 게임 화면(시작·만남·진행·선택·결말)으로 바뀐다.
 */
export function EnginePreview({ initialSeed }: { initialSeed?: number }) {
  const [seed, setSeed] = useState(() => initialSeed ?? randomSeed());
  const [name, setName] = useState('');
  const [run, setRun] = useState<RunState | null>(null);

  const meeting = previewMeeting(seed);
  const breed = getBreed(meeting.breedId);
  const coat = getCoat(breed, meeting.coatId);
  const record = run ? summarize(run) : null;

  function meetAnother() {
    setSeed(randomSeed());
    setName('');
    setRun(null);
  }

  return (
    <div className="app">
      <main className="app__main">
        <header className="app__header">
          <span className="app__eyebrow">
            <span aria-hidden>🎬</span> 엔진 미리보기 (1·2단계)
          </span>
          <h1 className="app__title">견생극장</h1>
          <p className="app__subtitle">
            사건과 선택 카드 문장을 검수하는 개발용 화면이에요. 3단계에서 실제 화면으로 바뀝니다.
          </p>
        </header>

        <section className="app__card preview__card" aria-label="오늘 만난 아이">
          <p className="preview__kicker">오늘 만난 아이 · 시드 {seed}</p>
          <h2 className="preview__breed">
            {meeting.nickname ? `${meeting.nickname} (${breed.name})` : breed.name}
          </h2>
          <dl className="preview__facts">
            <div>
              <dt>만난 곳</dt>
              <dd>{ROUTE_LABELS[meeting.route]}</dd>
            </div>
            <div>
              <dt>나이</dt>
              <dd>
                {formatAge(meeting.ageMonths)} ·{' '}
                {STAGE_LABELS[stageFor(breed.size, meeting.ageMonths)]}
              </dd>
            </div>
            <div>
              <dt>성별</dt>
              <dd>{meeting.sex === 'female' ? '여아' : '남아'}</dd>
            </div>
            <div>
              <dt>털색</dt>
              <dd>{coat.label}</dd>
            </div>
            <div>
              <dt>성격</dt>
              <dd>{meeting.traits.map((trait) => traitLabel(trait, meeting.sex)).join(', ')}</dd>
            </div>
          </dl>
          {meeting.intro.map((line) => (
            <p key={line} className="preview__intro">
              {line}
            </p>
          ))}

          <div className="preview__name">
            <label htmlFor="dog-name">이름</label>
            <input
              id="dog-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={meeting.suggestedNames[0]}
            />
            <div className="preview__suggestions">
              {meeting.suggestedNames.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="btn btn--small"
                  onClick={() => setName(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          <div className="preview__actions">
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => setRun(advanceUntilChoice(startRun({ seed, name })))}
            >
              선택하며 진행하기
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => setRun(simulateToEnd(startRun({ seed, name })))}
            >
              끝까지 자동으로 보기
            </button>
            <button type="button" className="btn" onClick={meetAnother}>
              다른 아이 만나기
            </button>
          </div>
        </section>

        {run && run.status === 'running' && (
          <section className="app__card preview__card" aria-label="진행 중">
            <p className="preview__kicker">
              함께한 지 {formatMonths(run.month)} · {formatAge(run.dogs[0].ageMonths)} ·{' '}
              {STAGE_LABELS[run.dogs[0].stage]}
            </p>
            <dl className="preview__stats">
              {(Object.keys(STAT_LABELS) as StatKey[]).map((key) => (
                <div key={key}>
                  <dt>{STAT_LABELS[key]}</dt>
                  <dd>
                    <meter min={0} max={100} value={run.dogs[0].stats[key]} />
                    {Math.round(run.dogs[0].stats[key])}
                  </dd>
                </div>
              ))}
              <div>
                <dt>여유</dt>
                <dd>
                  <meter min={0} max={100} value={run.household.ease} />
                  {Math.round(run.household.ease)}
                </dd>
              </div>
            </dl>
            {run.pendingChoice && (
              <div className="preview__choice" role="group" aria-label="선택 카드">
                <p className="preview__choice-text">{run.pendingChoice.text}</p>
                <div className="preview__actions">
                  {run.pendingChoice.choices.map((choice) => (
                    <button
                      key={choice.id}
                      type="button"
                      className="btn"
                      onClick={() => setRun(advanceUntilChoice(choose(run, choice.id)))}
                    >
                      {choice.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <button type="button" className="btn btn--ghost" onClick={() => setRun(simulateToEnd(run))}>
              남은 견생 자동으로 보기
            </button>
          </section>
        )}

        {run && record && run.status === 'ended' && (
          <section className="app__card preview__card" aria-label="견생 기록">
            <p className="preview__kicker">이번 상영작 · {record.arcTitle}</p>
            <h2 className="preview__breed">{record.dog.name}의 견생</h2>
            <p>
              함께한 시간 {formatMonths(record.dog.monthsTogether)} · 마지막 나이{' '}
              {formatAge(record.dog.ageAtEndMonths)} · 선택 {record.choicesMade}번
            </p>
            {record.highlights.length > 0 && (
              <ol className="preview__highlights" aria-label="기억에 남는 순간">
                {record.highlights.map((moment) => (
                  <li key={`${moment.month}-${moment.text}`}>{moment.text}</li>
                ))}
              </ol>
            )}
            <ol className="preview__map" aria-label="견생 지도 (한 칸이 한 달)">
              {record.timeline.map((cell) => (
                <li
                  key={cell.month}
                  className={`preview__cell preview__cell--${cell.mood}`}
                  title={`${cell.month}개월째 · ${STAGE_LABELS[cell.stage]}`}
                />
              ))}
            </ol>
          </section>
        )}

        {run && (
          <section className="app__card preview__card" aria-label="견생 로그">
            <ol className="preview__log">
              {run.log.map((entry, index) => (
                <li key={`${index}-${entry.month}-${entry.kind}`}>
                  <span className="preview__log-month">
                    {entry.month === 0 ? '첫날' : `${formatMonths(entry.month)}째`}
                  </span>
                  {entry.choice && <span className="preview__log-choice">[{entry.choice}] </span>}
                  {entry.text}
                </li>
              ))}
            </ol>
          </section>
        )}
      </main>
    </div>
  );
}
