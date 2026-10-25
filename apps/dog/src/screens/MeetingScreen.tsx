import { useId, useState } from 'react';
import { DogPortrait } from '../components/DogPortrait';
import { breedLabel, portraitLabel } from '../components/labels';
import { PortalLink } from '../components/PortalLink';
import {
  formatAge,
  getBreed,
  getCoat,
  josa,
  moodFor,
  previewMeeting,
  ROUTE_LABELS,
  STAGE_LABELS,
  stageFor,
  traitLabel,
} from '../engine';

export type MeetingScreenProps = {
  seed: number;
  onAdopt: (name: string) => void;
  onBack: () => void;
};

const MAX_NAME_LENGTH = 12;

export function MeetingScreen({ seed, onAdopt, onBack }: MeetingScreenProps) {
  const meeting = previewMeeting(seed);
  const breed = getBreed(meeting.breedId);
  const coat = getCoat(breed, meeting.coatId);
  const stage = stageFor(breed.size, meeting.ageMonths);
  const [name, setName] = useState('');
  const inputId = useId();
  const finalName = name.trim() || meeting.suggestedNames[0];

  return (
    <div className="app">
      <nav className="app__topbar" aria-label="송이랜드">
        <PortalLink />
      </nav>
      <main className="app__main">
        <header className="app__header">
          <span className="app__eyebrow">
            <span aria-hidden>🐾</span> 오늘 만난 아이
          </span>
        </header>

        <section className="app__card meeting" aria-labelledby="meeting-title">
          <DogPortrait
            className="meeting__dog"
            breedId={meeting.breedId}
            coatId={meeting.coatId}
            look={meeting.look}
            stage={stage}
            mood={moodFor(60)}
            label={portraitLabel(meeting)}
          />
          <h1 id="meeting-title" className="meeting__title">
            {breedLabel(meeting)}
          </h1>
          <div className="meeting__intro">
            {meeting.intro.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
          <dl className="facts">
            <div>
              <dt>만난 곳</dt>
              <dd>{ROUTE_LABELS[meeting.route]}</dd>
            </div>
            <div>
              <dt>나이</dt>
              <dd>
                {formatAge(meeting.ageMonths)} · {STAGE_LABELS[stage]}
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

          <form
            className="meeting__name"
            onSubmit={(event) => {
              event.preventDefault();
              onAdopt(finalName);
            }}
          >
            <label htmlFor={inputId}>이름을 지어 주세요</label>
            <input
              id={inputId}
              value={name}
              maxLength={MAX_NAME_LENGTH}
              onChange={(event) => setName(event.target.value)}
              placeholder={meeting.suggestedNames[0]}
              autoComplete="off"
            />
            <div className="chips" aria-label="추천 이름">
              {meeting.suggestedNames.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="chip"
                  aria-pressed={name === suggestion}
                  onClick={() => setName(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
            <div className="meeting__actions">
              <button type="submit" className="btn btn--primary btn--large">
                {josa(finalName, '과/와')} 가족이 되기
              </button>
              <button type="button" className="btn btn--ghost" onClick={onBack}>
                처음으로
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
