import { FILLING_IDS, FILLINGS, type FillingId } from '../engine';
import { fillingUnlocked } from '../game/session';

/** 소 고르개. 고른 소를 빈 틀에 붓는다. 고구마는 장사 후반에 열린다. */
export function FillingPicker({
  selected,
  elapsedMs,
  durationMs,
  onSelect,
}: {
  selected: FillingId;
  elapsedMs: number;
  durationMs: number;
  onSelect: (filling: FillingId) => void;
}) {
  return (
    <div className="picker" role="group" aria-label="소 고르기">
      {FILLING_IDS.map((filling) => {
        const unlocked = fillingUnlocked(filling, elapsedMs, durationMs);
        return (
          <button
            key={filling}
            type="button"
            className={`picker__btn ${selected === filling ? 'picker__btn--on' : ''}`}
            aria-pressed={selected === filling}
            disabled={!unlocked}
            onClick={() => onSelect(filling)}
          >
            <span className="picker__emoji">{FILLINGS[filling].emoji}</span>
            {FILLINGS[filling].label}
            {!unlocked && <span className="picker__lock"> · 후반 개방</span>}
          </button>
        );
      })}
    </div>
  );
}
