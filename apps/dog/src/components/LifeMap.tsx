import type { Mood, TimelineCell } from '../engine';
import { STAGE_LABELS } from '../engine';

const MOOD_LABELS: Record<Mood, string> = {
  great: '아주 좋음',
  good: '좋음',
  okay: '보통',
  low: '시무룩',
};

/** 견생 지도: 한 칸이 한 달. 그달 기분에 따라 색이 다르다. */
export function LifeMap({ cells, compact = false }: { cells: readonly TimelineCell[]; compact?: boolean }) {
  return (
    <div className="lifemap">
      <ol
        className={`lifemap__cells${compact ? ' lifemap__cells--compact' : ''}`}
        aria-label={`견생 지도, 한 칸이 한 달, 모두 ${cells.length}칸`}
      >
        {cells.map((cell) => (
          <li
            key={cell.month}
            className={`lifemap__cell lifemap__cell--${cell.mood}`}
            title={`${cell.month}개월째 · ${STAGE_LABELS[cell.stage]} · ${MOOD_LABELS[cell.mood]}`}
          />
        ))}
      </ol>
      <ul className="lifemap__legend" aria-label="색 설명">
        {(Object.keys(MOOD_LABELS) as Mood[]).map((mood) => (
          <li key={mood}>
            <span className={`lifemap__swatch lifemap__cell--${mood}`} aria-hidden />
            {MOOD_LABELS[mood]}
          </li>
        ))}
      </ul>
    </div>
  );
}
