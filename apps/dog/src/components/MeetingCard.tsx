import {
  formatAge,
  getBreed,
  getCoat,
  moodFor,
  ROUTE_LABELS,
  STAGE_LABELS,
  stageFor,
  traitLabel,
  type Meeting,
} from '../engine';
import { DogPortrait } from './DogPortrait';
import { breedLabel, portraitLabel } from './labels';

export type MeetingCardProps = {
  meeting: Meeting;
  titleId: string;
  /** 첫 만남 화면은 h1, 진행 화면 위 새 식구 카드는 h2. */
  heading: 'h1' | 'h2';
};

/** "오늘 만난 아이" 카드 내용: 그림, 견종, 소개, 만난 곳·나이·성별·털색·성격. */
export function MeetingCard({ meeting, titleId, heading: Heading }: MeetingCardProps) {
  const breed = getBreed(meeting.breedId);
  const coat = getCoat(breed, meeting.coatId);
  const stage = stageFor(breed.size, meeting.ageMonths);

  return (
    <>
      <DogPortrait
        className="meeting__dog"
        breedId={meeting.breedId}
        coatId={meeting.coatId}
        look={meeting.look}
        stage={stage}
        mood={moodFor(60)}
        label={portraitLabel(meeting)}
      />
      <Heading id={titleId} className="meeting__title">
        {breedLabel(meeting)}
      </Heading>
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
    </>
  );
}
