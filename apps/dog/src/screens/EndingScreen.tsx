import { useState } from 'react';
import { DogPortrait } from '../components/DogPortrait';
import { breedLabel, portraitLabel } from '../components/labels';
import { LifeMap } from '../components/LifeMap';
import { PortalLink } from '../components/PortalLink';
import {
  formatAge,
  formatMonths,
  josa,
  summarize,
  type FamilyRecord,
  type LogEntry,
  type RunState,
} from '../engine';

export type EndingScreenProps = {
  run: RunState;
  onAgain: () => void;
};

function when(month: number): string {
  return month === 0 ? '첫날' : `${formatMonths(month)}째`;
}

function StoryItems({ entries }: { entries: readonly LogEntry[] }) {
  return entries.map((entry, index) => (
    <li key={index} className={`story__entry story__entry--${entry.kind}`}>
      <span className="story__when">{when(entry.month)}</span>
      <span className="story__text">
        {entry.choice && <strong className="story__choice">{entry.choice}</strong>}
        {entry.text}
      </span>
    </li>
  ));
}

/** 첫째와 함께한 다른 아이의 기록 카드. 남은 아이는 첫째를 보낸 뒤의 이야기까지 담는다. */
function FamilyCard({ member, firstName }: { member: FamilyRecord; firstName: string }) {
  const { dog, summary } = member;
  const titleId = `family-${summary.id}`;
  const after = josa(formatMonths(member.monthsAfter), '을/를');
  return (
    <article className="family__card" aria-labelledby={titleId}>
      <DogPortrait
        className="family__dog"
        breedId={dog.breedId}
        coatId={dog.coatId}
        look={dog.look}
        stage={dog.stage}
        mood="good"
        label={portraitLabel(dog, summary.name)}
      />
      <div className="family__body">
        <p className="family__badge">{member.leftFirst ? '먼저 떠난 아이' : '남은 아이의 이야기'}</p>
        <h3 id={titleId} className="family__name">
          {summary.name}의 견생
        </h3>
        <p className="family__meta">
          {breedLabel(dog)} · {summary.route} · {formatAge(summary.metAgeMonths)} →{' '}
          {formatAge(summary.ageAtEndMonths)} · 함께한 시간 {formatMonths(summary.monthsTogether)}
        </p>
        <p className="family__line">
          {member.leftFirst
            ? `${firstName}보다 먼저 강아지별로 떠났어요.`
            : `${josa(firstName, '을/를')} 보낸 뒤에도 ${after} 더 함께했어요.`}
        </p>
        {member.highlights.length > 0 && (
          <ol className="family__moments">
            {member.highlights.map((moment) => (
              <li key={`${moment.month}-${moment.text}`}>{moment.text}</li>
            ))}
          </ol>
        )}
        {member.farewell && <p className="family__farewell">{member.farewell}</p>}
      </div>
    </article>
  );
}

/** 견생 기록 카드. 공유 이미지 저장은 5단계에서 붙는다. */
export function EndingScreen({ run, onAgain }: EndingScreenProps) {
  const [showStory, setShowStory] = useState(false);
  const record = summarize(run);
  const dog = run.dogs[0];

  return (
    <div className="app">
      <nav className="app__topbar" aria-label="송이랜드">
        <PortalLink />
      </nav>
      <main className="app__main">
        <section className="app__card ending" aria-labelledby="ending-title">
          <p className="ending__kicker">이번 상영작 · {record.arcTitle}</p>
          <DogPortrait
            className="ending__dog"
            breedId={dog.breedId}
            coatId={dog.coatId}
            look={dog.look}
            stage={dog.stage}
            mood="good"
            label={portraitLabel(dog, dog.name)}
          />
          <h1 id="ending-title" className="ending__title">
            {record.dog.name}의 견생
          </h1>
          <p className="ending__meta">
            {breedLabel(dog)} · {record.dog.coatLabel} · {record.dog.traits.join(', ')}
          </p>
          <dl className="facts facts--center">
            <div>
              <dt>함께한 시간</dt>
              <dd>{formatMonths(record.dog.monthsTogether)}</dd>
            </div>
            <div>
              <dt>만난 곳</dt>
              <dd>{record.dog.route}</dd>
            </div>
            <div>
              <dt>나이</dt>
              <dd>
                {formatAge(record.dog.metAgeMonths)} → {formatAge(record.dog.ageAtEndMonths)}
              </dd>
            </div>
            <div>
              <dt>선택</dt>
              <dd>{record.choicesMade}번</dd>
            </div>
          </dl>

          {record.highlights.length > 0 && (
            <div className="ending__moments">
              <h2 className="section-title">기억에 남는 순간</h2>
              <ol>
                {record.highlights.map((moment) => (
                  <li key={`${moment.month}-${moment.text}`}>
                    <span className="story__when">{when(moment.month)}</span>
                    {moment.text}
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="ending__map">
            <h2 className="section-title">견생 지도</h2>
            <LifeMap cells={record.timeline} compact />
          </div>

          <div className="ending__actions">
            <button type="button" className="btn btn--primary btn--large" onClick={onAgain}>
              한 번 더 상영하기
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => setShowStory(!showStory)}>
              {showStory ? '이야기 접기' : '이야기 전체 보기'}
            </button>
          </div>
        </section>

        {record.family.length > 0 && (
          <section className="app__card family" aria-labelledby="family-title">
            <h2 id="family-title" className="section-title">
              함께한 가족
            </h2>
            <div className="family__cards">
              {record.family.map((member) => (
                <FamilyCard key={member.summary.id} member={member} firstName={record.dog.name} />
              ))}
            </div>
          </section>
        )}

        {showStory && (
          <section className="app__card" aria-label="이야기 전체">
            <ol className="story">
              <StoryItems entries={run.log} />
            </ol>
            {run.epilogue && (
              <>
                <h2 className="section-title story__epilogue">남은 아이들의 이야기</h2>
                <ol className="story">
                  <StoryItems entries={run.epilogue.log} />
                </ol>
              </>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
