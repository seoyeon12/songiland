import type { StatKey, Stats } from '../engine';

const LABELS: Record<StatKey | 'ease', string> = {
  health: '건강',
  happiness: '행복',
  bond: '유대',
  sociability: '사회성',
  ease: '여유',
};

/** 이름표와 막대, 숫자 한 줄. 동생 카드에서도 쓴다. */
export function Meter({
  label,
  name,
  value,
  variant,
}: {
  label: string;
  name: string;
  value: number;
  variant?: 'household' | 'pair';
}) {
  const rounded = Math.round(value);
  return (
    <div className={`stats__row${variant ? ` stats__row--${variant}` : ''}`}>
      <dt>{label}</dt>
      <dd>
        <span
          className="stats__bar"
          role="meter"
          aria-label={name}
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
}

/** 능력치 막대. 강아지 네 가지와 가정의 여유. */
export function StatBars({ stats, ease }: { stats: Stats; ease: number }) {
  const rows: [StatKey, number][] = [
    ['health', stats.health],
    ['happiness', stats.happiness],
    ['bond', stats.bond],
    ['sociability', stats.sociability],
  ];
  return (
    <dl className="stats">
      {rows.map(([key, value]) => (
        <Meter key={key} label={LABELS[key]} name={LABELS[key]} value={value} />
      ))}
      <Meter label={LABELS.ease} name={LABELS.ease} value={ease} variant="household" />
    </dl>
  );
}
