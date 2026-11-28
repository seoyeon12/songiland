import { VOWELS, type KanaChar, type KanaRow } from '../../data/kana';
import './chart.css';

export type KanaChartProps = {
  /** 표 제목. 화면 읽기 프로그램이 표 이름으로 읽는다. */
  caption: string;
  rows: readonly KanaRow[];
  /** 북마크한 문자 id. 칸 모서리에 ★로 표시한다. */
  bookmarks?: ReadonlySet<string>;
  /** 칸을 누르면 부른다. 소리 재생도 이 안에서 바로 해야 iOS가 막지 않는다. */
  onSelect?: (kana: KanaChar) => void;
};

/** 오십음도 문자표. 행은 あ·か·さ…, 칸은 a·i·u·e·o 단이다. */
export function KanaChart({ caption, rows, bookmarks, onSelect }: KanaChartProps) {
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
                  <ChartCellContent
                    kana={kana}
                    bookmarked={bookmarks?.has(kana.id) ?? false}
                    onSelect={onSelect}
                  />
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

function ChartCellContent({
  kana,
  bookmarked,
  onSelect,
}: {
  kana: KanaChar;
  bookmarked: boolean;
  onSelect: KanaChartProps['onSelect'];
}) {
  const content = (
    <>
      <span className="chart__kana" lang="ja">
        {kana.char}
      </span>
      <span className="chart__reading">
        <span className="chart__romaji">{kana.romaji}</span>
        <span className="chart__hangul">{kana.hangul}</span>
      </span>
      {bookmarked && (
        <span className="chart__mark">
          <span aria-hidden>★</span>
          <span className="visually-hidden">내 문자</span>
        </span>
      )}
    </>
  );
  if (!onSelect) {
    return <span className="chart__face">{content}</span>;
  }
  return (
    <button type="button" className="chart__face chart__button" onClick={() => onSelect(kana)}>
      {content}
    </button>
  );
}
