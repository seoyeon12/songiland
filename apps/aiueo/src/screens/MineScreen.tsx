import type { KanaChar } from '../data/kana';
import { bookmarkedKana } from '../study/ranges';

export type MineScreenProps = {
  bookmarks: ReadonlySet<string>;
  /** 저장이 막힌 브라우저면 `memory`. 새로 고치면 사라진다고 알린다. */
  persistence: 'local' | 'memory';
  onSelect: (kana: KanaChar) => void;
  onStart: () => void;
};

/** 내 문자 탭: ★로 담은 문자만 모아 본다(기획서 7장). */
export function MineScreen({ bookmarks, persistence, onSelect, onStart }: MineScreenProps) {
  const kana = bookmarkedKana(bookmarks);

  return (
    <>
      <header className="aiueo__screen-head">
        <h1 className="aiueo__screen-title">내 문자</h1>
        <p className="aiueo__lead">
          {kana.length > 0
            ? `${kana.length}자를 담았어요. 헷갈리는 글자만 모아 따로 익혀요.`
            : '헷갈리는 글자를 모아 두는 곳이에요.'}
        </p>
      </header>

      {kana.length === 0 ? (
        <div className="aiueo__empty">
          <span className="aiueo__empty-icon" aria-hidden>
            ☆
          </span>
          <p>카드에서 ☆ 내 문자 버튼을 누르면 여기에 모여요.</p>
        </div>
      ) : (
        <>
          <ul className="mine" aria-label="담은 문자">
            {kana.map((item) => (
              <li key={item.id}>
                <button type="button" className="mine__item" onClick={() => onSelect(item)}>
                  <span className="mine__kana" lang="ja">
                    {item.char}
                  </span>
                  <span className="mine__romaji">{item.romaji}</span>
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="btn btn--primary btn--large" onClick={onStart}>
            카드로 보기
          </button>
        </>
      )}

      {persistence === 'memory' && (
        <p className="aiueo__warning" role="note">
          이 브라우저는 저장이 막혀 있어서, 새로 고치면 담은 문자가 사라져요.
        </p>
      )}
    </>
  );
}
