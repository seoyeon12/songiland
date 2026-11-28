import { HIRAGANA_SEION, HIRAGANA_SEION_ROWS, type KanaChar } from '../data/kana';
import { KanaChart } from '../features/chart/KanaChart';
import { MAX_BOX, masteryLevel, type MasteryMap } from '../progress/mastery';

export type ChartScreenProps = {
  bookmarks: ReadonlySet<string>;
  /** 읽기 숙련도. 칸 색으로 보여 준다(기획서 7장). */
  mastery: MasteryMap;
  onSelect: (kana: KanaChar) => void;
};

const LEVELS = Array.from({ length: MAX_BOX }, (_, index) => index + 1);

/** 첫 화면: 히라가나 청음 오십음도. 글자를 누르면 소리가 나고 그 글자 카드가 열린다. */
export function ChartScreen({ bookmarks, mastery, onSelect }: ChartScreenProps) {
  const levels = new Map(
    HIRAGANA_SEION.map((kana) => [kana.id, masteryLevel(mastery[kana.id])] as const).filter(
      ([, level]) => level > 0,
    ),
  );

  return (
    <>
      <header className="app__header">
        <span className="app__eyebrow">
          <span aria-hidden>🗾</span> 일본어 첫 글자
        </span>
        <h1 className="app__title">아이우에오</h1>
        <p className="app__subtitle">
          히라가나 46자부터 차근차근. 보고, 듣고, 써 보며 익혀요.
        </p>
      </header>

      <section className="aiueo__section" aria-labelledby="aiueo-seion">
        <div className="aiueo__section-head">
          <h2 id="aiueo-seion" className="aiueo__section-title">
            히라가나 <span lang="ja">ひらがな</span>
          </h2>
          <span className="aiueo__count">청음 {HIRAGANA_SEION.length}자</span>
        </div>
        <p className="aiueo__lead">글자를 누르면 소리를 듣고 카드로 볼 수 있어요.</p>
        <KanaChart
          caption="히라가나 청음 오십음도"
          rows={HIRAGANA_SEION_ROWS}
          bookmarks={bookmarks}
          levels={levels}
          onSelect={onSelect}
        />
        {levels.size > 0 && (
          <ul className="chart-legend" aria-label="숙련도 색">
            <li className="chart-legend__item">
              <span className="chart-legend__swatch" aria-hidden />
              아직
            </li>
            {LEVELS.map((level) => (
              <li key={level} className="chart-legend__item">
                <span className={`chart-legend__swatch chart-legend__swatch--${level}`} aria-hidden />
                {level}단계
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="aiueo__note">
        발음 표기는 헵번식 로마자예요. 한글은 비슷한 소리를 적은 참고용이에요.
      </p>
    </>
  );
}
