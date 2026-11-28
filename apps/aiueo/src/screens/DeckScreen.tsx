import { useEffect, useEffectEvent, useId, useRef, useState, type PointerEvent } from 'react';
import type { DeckRoute } from '../app/router';
import type { KanaChar } from '../data/kana';
import { MINE_RANGE_ID, resolveRange, shuffled, type StudyProgress } from '../study/ranges';
import './deck.css';

export type DeckScreenProps = {
  route: DeckRoute;
  bookmarks: ReadonlySet<string>;
  /** 복습할·약한 문자 범위를 풀 때 쓴다. 연 순간에 한 번만 읽는다. */
  progress: StudyProgress;
  onToggleBookmark: (id: string) => void;
  /** 소리 재생. 터치·클릭 처리 안에서만 부른다. */
  onPlay: (kana: KanaChar) => void;
  /** 다른 카드로 넘어갔다. 주소의 `at`을 바꾼다(replace). */
  onMove: (at: string) => void;
  onBack: () => void;
};

/** 이만큼 옆으로 밀면 카드를 넘긴다(px). */
const SWIPE_MIN = 48;

type Side = 'front' | 'back';

/** 문자카드 넘기기. 앞면은 문자만, 누르면 뒷면에 발음이 나오고 소리가 난다(기획서 6.1). */
export function DeckScreen({
  route,
  bookmarks,
  progress,
  onToggleBookmark,
  onPlay,
  onMove,
  onBack,
}: DeckScreenProps) {
  // 카드 목록은 연 순간에 고정한다. 내 문자 묶음을 보다가 ★를 꺼도 카드가 사라지지 않는다.
  const [deck] = useState(() => {
    const range = resolveRange(route.range, bookmarks, progress);
    if (!range) {
      return null;
    }
    const cards = route.shuffle ? shuffled(range.kana, route.shuffle) : [...range.kana];
    return { label: range.label, cards };
  });
  const [side, setSide] = useState<Side>(route.reveal ? 'back' : 'front');
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const hintId = useId();

  const cards = deck?.cards ?? [];
  const found = cards.findIndex((kana) => kana.id === route.at);
  const index = found >= 0 ? found : 0;
  const card = cards[index];
  const isLast = index === cards.length - 1;

  function goTo(next: number) {
    const target = cards[next];
    if (!target) {
      return;
    }
    setSide('front');
    onMove(target.id);
  }

  const goPrev = () => goTo(index - 1);
  const goNext = () => goTo(isLast ? 0 : index + 1);

  // 화살표 키로도 넘긴다.
  const onArrowKey = useEffectEvent((event: KeyboardEvent) => {
    if (event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }
    if (event.key === 'ArrowLeft' && index > 0) {
      goPrev();
    } else if (event.key === 'ArrowRight') {
      goNext();
    }
  });
  useEffect(() => {
    window.addEventListener('keydown', onArrowKey);
    return () => window.removeEventListener('keydown', onArrowKey);
  }, []);

  function flip() {
    if (swiped.current) {
      swiped.current = false;
      return;
    }
    if (!card) {
      return;
    }
    if (side === 'front') {
      setSide('back');
      onPlay(card);
    } else {
      setSide('front');
    }
  }

  function onPointerDown(event: PointerEvent) {
    pointer.current = { x: event.clientX, y: event.clientY };
    swiped.current = false;
  }

  function onPointerUp(event: PointerEvent) {
    const start = pointer.current;
    pointer.current = null;
    if (!start) {
      return;
    }
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) < Math.abs(dy)) {
      return;
    }
    // 밀고 난 뒤 따라오는 click이 카드를 뒤집지 않게 한다.
    swiped.current = true;
    window.setTimeout(() => (swiped.current = false), 400);
    if (dx < 0) {
      goNext();
    } else if (index > 0) {
      goPrev();
    }
  }

  const bookmarked = card ? bookmarks.has(card.id) : false;

  return (
    <div className="app aiueo deck">
      <header className="deck__bar">
        <button type="button" className="btn btn--ghost btn--small deck__back" onClick={onBack}>
          <span aria-hidden>←</span> {deck?.label ?? '카드'}
        </button>
        {card && (
          <span className="deck__progress" aria-label={`${cards.length}장 중 ${index + 1}번째`}>
            {index + 1} / {cards.length}
          </span>
        )}
      </header>

      <main className="deck__main">
        <h1 className="visually-hidden">{deck ? `${deck.label} 카드` : '카드'}</h1>

        {!deck && <DeckMessage text="없는 카드 묶음이에요." onBack={onBack} />}
        {deck && !card && (
          <DeckMessage
            text={
              route.range === MINE_RANGE_ID
                ? '담은 문자가 없어요. 문자표나 카드에서 ☆를 눌러 담아 보세요.'
                : '이 범위에는 지금 문자가 없어요.'
            }
            onBack={onBack}
          />
        )}

        {card && (
          <>
            <div
              className="deck__stage"
              onPointerDown={onPointerDown}
              onPointerUp={onPointerUp}
              onPointerCancel={() => (pointer.current = null)}
            >
              <button
                type="button"
                key={`${card.id}-${side}`}
                className={`card card--${side}`}
                onClick={flip}
                aria-describedby={hintId}
              >
                <span className="card__kana" lang="ja">
                  {card.char}
                </span>
                {side === 'back' && (
                  <span className="card__reading">
                    <span className="card__romaji">{card.romaji}</span>
                    <span className="card__hangul">{card.hangul}</span>
                  </span>
                )}
                {side === 'back' && card.note && <span className="card__note">{card.note}</span>}
              </button>
            </div>
            <p id={hintId} className="deck__hint">
              {side === 'front'
                ? '카드를 눌러 발음을 확인해요. 옆으로 밀면 넘어가요.'
                : '다시 누르면 가려져요.'}
            </p>
            {/* 뒤집어도 포커스는 카드에 그대로라, 발음을 따로 읽어 준다. */}
            <p className="visually-hidden" aria-live="polite">
              {side === 'back' ? `${card.romaji}, ${card.hangul}` : ''}
            </p>

            <div className="deck__actions">
              <button
                type="button"
                className="btn deck__nav"
                onClick={goPrev}
                disabled={index === 0}
                aria-label="이전 카드"
              >
                <span aria-hidden>‹</span>
              </button>
              <button type="button" className="btn" onClick={() => onPlay(card)}>
                <span aria-hidden>🔊</span> 듣기
              </button>
              <button
                type="button"
                className={`btn deck__bookmark${bookmarked ? ' deck__bookmark--on' : ''}`}
                onClick={() => onToggleBookmark(card.id)}
                aria-pressed={bookmarked}
                aria-label="내 문자에 담기"
              >
                <span aria-hidden>{bookmarked ? '★ 담음' : '☆ 담기'}</span>
              </button>
              <button
                type="button"
                className="btn deck__nav"
                onClick={goNext}
                aria-label={isLast ? '처음 카드로' : '다음 카드'}
              >
                <span aria-hidden>{isLast ? '↺' : '›'}</span>
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function DeckMessage({ text, onBack }: { text: string; onBack: () => void }) {
  return (
    <div className="deck__message">
      <p>{text}</p>
      <button type="button" className="btn btn--primary" onClick={onBack}>
        돌아가기
      </button>
    </div>
  );
}
