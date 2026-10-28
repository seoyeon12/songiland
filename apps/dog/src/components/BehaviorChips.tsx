import { behaviorsOf, type Dog } from '../engine';

/** 지금 겪고 있는 문제행동(좋아지면 사라진다). 없으면 아무것도 그리지 않는다. */
export function BehaviorChips({ dog }: { dog: Dog }) {
  const active = behaviorsOf(dog).filter((behavior) => !behavior.eased);
  if (active.length === 0) {
    return null;
  }
  return (
    <ul className="chips chips--static chips--concern" aria-label={`${dog.name}의 행동 고민`}>
      {active.map((behavior) => (
        <li key={behavior.id} className="chip">
          {behavior.label}
        </li>
      ))}
    </ul>
  );
}
