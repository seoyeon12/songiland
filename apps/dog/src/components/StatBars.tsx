import type { StatKey, Stats } from '../engine';

const LABELS: Record<StatKey | 'ease', string> = {
  health: '건강',
  happiness: '행복',
  bond: '유대',
  sociability: '사회성',
  ease: '여유',
};

/** 능력치 막대. 강아지 네 가지와 가정의 여유. */
export function StatBars({ stats, ease }: { stats: Stats; ease: number }) {
  const rows: [StatKey | 'ease', number][] = [
    ['health', stats.health],
    ['happiness', stats.happiness],
    ['bond', stats.bond],
    ['sociability', stats.sociability],
    ['ease', ease],
  ];
  return (
    <dl className="stats">
      {rows.map(([key, value]) => {
        const rounded = Math.round(value);
        return (
          <div key={key} className={`stats__row${key === 'ease' ? ' stats__row--household' : ''}`}>
            <dt>{LABELS[key]}</dt>
            <dd>
              <span
                className="stats__bar"
                role="meter"
                aria-label={LABELS[key]}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={rounded}
              >
                <span className="stats__fill" style={{ width: `${rounded}%` }} />
              </span>
              <span className="stats__value">{rounded}</span>
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
