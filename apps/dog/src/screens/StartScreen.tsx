import { PAST_LIVES_LIMIT, type PastLife } from '../app/storage';
import { DogPortrait } from '../components/DogPortrait';
import { PortalLink } from '../components/PortalLink';
import { arcTitle, formatAge, formatMonths, josa, type RunState } from '../engine';
import { breedLabel } from '../components/labels';

/** 시작 화면을 꾸미는 세 마리. 실제 판과는 상관없다. */
const CAST = [
  { breedId: 'mix-medium', coatId: 'hwanggu', look: { ears: 'erect', coatType: 'short', tail: 'curled', legs: 'normal' } },
  { breedId: 'bichon', coatId: 'white', look: { ears: 'drop', coatType: 'curly', tail: 'curled', legs: 'normal' } },
  { breedId: 'welsh-corgi', coatId: 'red-white', look: { ears: 'erect', coatType: 'short', tail: 'short', legs: 'short' } },
] as const;

export type StartScreenProps = {
  saved: RunState | null;
  /** 지난 견생, 최근 것부터 */
  lives: readonly PastLife[];
  onOpenLife: (life: PastLife) => void;
  onMeet: () => void;
  onResume: () => void;
};

const SHORT_DATE = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' });

function PastLifeItem({ life, onOpen }: { life: PastLife; onOpen: () => void }) {
  const dog = life.run.dogs[0];
  return (
    <li>
      <button type="button" className="lives__item" onClick={onOpen}>
        <DogPortrait
          className="lives__face"
          breedId={dog.breedId}
          coatId={dog.coatId}
          look={dog.look}
          stage={dog.stage}
          mood="good"
          framing="face"
        />
        <span className="lives__body">
          <span className="lives__name">{dog.name}의 견생</span>
          <span className="lives__meta">
            {breedLabel(dog)} · {formatMonths(dog.ageMonths - dog.metAgeMonths)} ·{' '}
            {arcTitle(life.run.arc)}
          </span>
        </span>
        <span className="lives__date">{SHORT_DATE.format(life.endedAt)}</span>
      </button>
    </li>
  );
}

export function StartScreen({ saved, lives, onOpenLife, onMeet, onResume }: StartScreenProps) {
  const savedDog = saved?.dogs[0];
  return (
    <div className="app">
      <nav className="app__topbar" aria-label="송이랜드">
        <PortalLink />
      </nav>
      <main className="app__main start">
        <div className="start__cast" aria-hidden>
          {CAST.map((dog) => (
            <DogPortrait
              key={dog.breedId}
              className="start__dog"
              breedId={dog.breedId}
              coatId={dog.coatId}
              look={dog.look}
              stage="adult"
              mood="great"
              label=""
            />
          ))}
        </div>
        <header className="app__header">
          <span className="app__eyebrow">
            <span aria-hidden>🎬</span> 오늘의 상영작
          </span>
          <h1 className="app__title">견생극장</h1>
          <p className="app__subtitle">
            어느 날 운명처럼 만난 강아지와 무지개다리까지 함께하는 10~15분짜리 견생
            이야기예요. 견종도, 만나는 곳도, 이야기의 흐름도 매번 달라요.
          </p>
        </header>

        <div className="start__actions">
          {savedDog && (
            <button type="button" className="btn btn--primary btn--large" onClick={onResume}>
              {josa(savedDog.name, '과/와')}의 견생 이어 보기
            </button>
          )}
          <button
            type="button"
            className={`btn btn--large${savedDog ? '' : ' btn--primary'}`}
            onClick={onMeet}
          >
            {savedDog ? '새로운 아이 만나기' : '만나러 가기'}
          </button>
          {savedDog && (
            <p className="start__note">
              {breedLabel(savedDog)} · {formatAge(savedDog.ageMonths)}. 새로운 아이를 만나면 지금
              견생은 사라져요.
            </p>
          )}
        </div>

        {lives.length > 0 && (
          <section className="app__card lives" aria-labelledby="lives-title">
            <h2 id="lives-title" className="section-title">
              지난 견생
            </h2>
            <ol className="lives__list">
              {lives.map((life) => (
                <PastLifeItem key={life.run.seed} life={life} onOpen={() => onOpenLife(life)} />
              ))}
            </ol>
            <p className="lives__note">최근 {PAST_LIVES_LIMIT}편까지 남아요.</p>
          </section>
        )}
      </main>
      <footer className="app__footer">
        <p>견종별 수치는 재미를 위해 단순화한 경향이며 수의학적 조언이 아니에요.</p>
        <p>견생 기록은 이 브라우저에만 저장되고 어디로도 보내지 않아요.</p>
      </footer>
    </div>
  );
}
