import {
  formatAge,
  isAlive,
  josa,
  moodFor,
  rapportBetween,
  STAGE_LABELS,
  type RunState,
} from '../engine';
import { DogPortrait } from './DogPortrait';
import { Meter } from './StatBars';

/** 이 아이보다 먼저 가족이 된, 지금 함께 사는 아이들과의 사이. 두 아이 사이는 한 카드에만 나온다. */
function rapportRows(run: RunState, index: number) {
  const dog = run.dogs[index];
  return run.dogs.slice(0, index).flatMap((other) => {
    const rapport = isAlive(other) ? rapportBetween(run, dog.id, other.id) : undefined;
    return rapport === undefined ? [] : [{ other, rapport }];
  });
}

function SiblingCard({ run, index }: { run: RunState; index: number }) {
  const dog = run.dogs[index];
  const gone = !isAlive(dog);
  const titleId = `sibling-${dog.id}`;
  return (
    <li className={`sibling${gone ? ' sibling--gone' : ''}`}>
      <section aria-labelledby={titleId}>
        <div className="sibling__head">
          <DogPortrait
            className="sibling__dog"
            framing="face"
            breedId={dog.breedId}
            coatId={dog.coatId}
            look={dog.look}
            stage={dog.stage}
            mood={moodFor(dog.stats.happiness)}
          />
          <div>
            <h2 id={titleId} className="sibling__name">
              {dog.name}
            </h2>
            <p className="sibling__meta">
              {gone
                ? `${formatAge(dog.ageMonths)}에 강아지별로 떠났어요`
                : `${formatAge(dog.ageMonths)} · ${STAGE_LABELS[dog.stage]}`}
            </p>
          </div>
        </div>
        {!gone && (
          <dl className="stats stats--compact">
            <Meter label="건강" name={`${dog.name} 건강`} value={dog.stats.health} />
            <Meter label="행복" name={`${dog.name} 행복`} value={dog.stats.happiness} />
            {rapportRows(run, index).map(({ other, rapport }) => (
              <Meter
                key={other.id}
                label={`${josa(other.name, '과/와')} 사이`}
                name={`${dog.name}, ${josa(other.name, '과/와')} 사이`}
                value={rapport}
                variant="pair"
              />
            ))}
          </dl>
        )}
      </section>
    </li>
  );
}

/** 첫째와 함께 사는 동생들. 진행 화면에서 첫째 아래에 작은 카드로 한눈에 보여 준다. */
export function SiblingCards({ run }: { run: RunState }) {
  if (run.dogs.length < 2) {
    return null;
  }
  return (
    <ul className="siblings" aria-label="함께 사는 동생들">
      {run.dogs.slice(1).map((dog, offset) => (
        <SiblingCard key={dog.id} run={run} index={offset + 1} />
      ))}
    </ul>
  );
}
