import { useId, useState } from 'react';
import { bookmarkedKana, FIXED_RANGES, MINE_RANGE_ID, type StudyRange } from '../study/ranges';

export type CardsScreenProps = {
  bookmarks: ReadonlySet<string>;
  /** 범위를 골랐다. `shuffle`이면 섞어서 연다. */
  onStart: (rangeId: string, shuffle: boolean) => void;
};

/** 카드 탭: 어떤 글자들로 카드를 넘길지 고른다. */
export function CardsScreen({ bookmarks, onStart }: CardsScreenProps) {
  const [shuffle, setShuffle] = useState(false);
  const shuffleId = useId();
  const mineCount = bookmarkedKana(bookmarks).length;

  return (
    <>
      <header className="aiueo__screen-head">
        <h1 className="aiueo__screen-title">문자카드</h1>
        <p className="aiueo__lead">문자만 보고 소리를 떠올린 뒤, 카드를 눌러 확인해요.</p>
      </header>

      <label className="aiueo__switch" htmlFor={shuffleId}>
        <input
          id={shuffleId}
          type="checkbox"
          checked={shuffle}
          onChange={(event) => setShuffle(event.target.checked)}
        />
        <span>순서 섞기</span>
      </label>

      <ul className="ranges" aria-label="카드 묶음">
        <li>
          <RangeButton
            label="내 문자"
            detail={mineCount > 0 ? `${mineCount}자` : '아직 없어요'}
            preview="★"
            disabled={mineCount === 0}
            onClick={() => onStart(MINE_RANGE_ID, shuffle)}
          />
        </li>
        {FIXED_RANGES.map((range) => (
          <li key={range.id}>
            <RangeButton
              label={range.label}
              detail={`${range.kana.length}자`}
              preview={previewOf(range)}
              previewLang="ja"
              onClick={() => onStart(range.id, shuffle)}
            />
          </li>
        ))}
      </ul>
    </>
  );
}

function previewOf(range: StudyRange): string {
  return range.kana
    .slice(0, 5)
    .map((kana) => kana.char)
    .join('');
}

function RangeButton({
  label,
  detail,
  preview,
  previewLang,
  disabled = false,
  onClick,
}: {
  label: string;
  detail: string;
  preview: string;
  previewLang?: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" className="ranges__item" onClick={onClick} disabled={disabled}>
      <span className="ranges__preview" lang={previewLang} aria-hidden>
        {preview}
      </span>
      <span className="ranges__label">{label}</span>
      <span className="ranges__detail">{detail}</span>
    </button>
  );
}
