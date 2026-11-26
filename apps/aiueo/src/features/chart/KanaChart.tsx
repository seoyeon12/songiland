import { VOWELS, type KanaRow } from '../../data/kana';
import './chart.css';

export type KanaChartProps = {
  /** 표 제목. 화면 읽기 프로그램이 표 이름으로 읽는다. */
  caption: string;
  rows: readonly KanaRow[];
};

/** 오십음도 문자표. 행은 あ·か·さ…, 칸은 a·i·u·e·o 단이다. */
export function KanaChart({ caption, rows }: KanaChartProps) {
  return (
    <table className="chart">
      <caption className="visually-hidden">{caption}</caption>
      <thead>
        <tr>
          <td className="chart__corner" />
          {VOWELS.map((vowel) => (
            <th key={vowel} scope="col" className="chart__col-head">
              {vowel}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <th scope="row" className="chart__row-head">
              <span className="visually-hidden">{row.label}</span>
            </th>
            {row.cells.map((kana, column) =>
              kana ? (
                <td key={kana.id} className="chart__cell" data-kana-id={kana.id}>
                  <span className="chart__kana" lang="ja">
                    {kana.char}
                  </span>
                  <span className="chart__reading">
                    <span className="chart__romaji">{kana.romaji}</span>
                    <span className="chart__hangul">{kana.hangul}</span>
                  </span>
                </td>
              ) : (
                <td key={`${row.id}-${column}`} className="chart__cell chart__cell--empty" />
              ),
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
