import { appUrl } from '@songiland/catalog';
import { useEffect, useId, useState } from 'react';
import './converter.css';
import { convert, detectDirection, type Direction } from './convert';

type Mode = 'auto' | Direction;

const MODES: ReadonlyArray<{ value: Mode; label: string }> = [
  { value: 'auto', label: '자동 감지' },
  { value: 'toHangul', label: '영문 → 한글' },
  { value: 'toLatin', label: '한글 → 영문' },
];

const DIRECTION_LABEL: Record<Direction, string> = {
  toHangul: '영문 → 한글',
  toLatin: '한글 → 영문',
};

type CopyState = 'idle' | 'copied' | 'failed';

// 로컬 dev 서버에서는 포털 dev 서버로, 배포본에서는 songiland.arosys.kr로 돌아간다.
const PORTAL_URL = appUrl('portal', import.meta.env.DEV ? 'local' : 'production');

/** 한/영 키를 잘못 누른 채 친 글자를 두벌식 자판 기준으로 바로 되돌린다. */
export function KoEnConverter() {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<Mode>('auto');
  const [copyState, setCopyState] = useState<CopyState>('idle');
  const inputId = useId();
  const outputId = useId();

  const direction = mode === 'auto' ? detectDirection(text) : mode;
  const result = convert(text, direction);

  // "복사했어요" 안내는 잠깐만 보여 준다.
  useEffect(() => {
    if (copyState === 'idle') {
      return;
    }
    const timer = window.setTimeout(() => setCopyState('idle'), 2000);
    return () => window.clearTimeout(timer);
  }, [copyState]);

  async function copyResult() {
    try {
      await navigator.clipboard.writeText(result);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
  }

  function clear() {
    setText('');
    setCopyState('idle');
  }

  return (
    <div className="app koen">
      <nav className="app__topbar" aria-label="송이랜드">
        <a className="app__home" href={PORTAL_URL}>
          <span aria-hidden>←</span> 송이랜드
        </a>
      </nav>

      <main className="app__main">
        <header className="app__header">
          <span className="app__eyebrow">
            <span aria-hidden>⌨️</span> 한/영 키 실수 되돌리기
          </span>
          <h1 className="app__title">한영타 변환기</h1>
          <p className="app__subtitle">
            한/영 키를 잘못 누른 채 친 글자를 두벌식 자판 기준으로 바로 되돌려 드려요.
          </p>
        </header>

        <section className="app__card koen__card" aria-label="변환">
          <fieldset className="koen__modes">
            <legend className="visually-hidden">변환 방향</legend>
            {MODES.map((option) => (
              <label key={option.value} className="koen__mode">
                <input
                  type="radio"
                  name="direction"
                  value={option.value}
                  checked={mode === option.value}
                  onChange={() => setMode(option.value)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </fieldset>

          <div className="koen__field">
            <label className="koen__label" htmlFor={inputId}>
              입력
            </label>
            <textarea
              id={inputId}
              className="koen__input"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="예: dkssudgktpdy"
              rows={4}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              autoFocus
            />
          </div>

          <div className="koen__field">
            <div className="koen__label-row">
              <label className="koen__label" htmlFor={outputId}>
                결과
              </label>
              {mode === 'auto' && text !== '' && (
                <span className="koen__detected">
                  자동 감지 · {DIRECTION_LABEL[direction]}
                </span>
              )}
            </div>
            {/* 글자를 칠 때마다 읽어 주면 시끄러우므로 결과 상자는 실시간 안내를 끈다. */}
            <output
              id={outputId}
              className="koen__output"
              htmlFor={inputId}
              aria-live="off"
            >
              {result}
            </output>
          </div>

          <div className="koen__actions">
            <button
              type="button"
              className="btn btn--primary"
              onClick={copyResult}
              disabled={result === ''}
            >
              결과 복사
            </button>
            <button
              type="button"
              className="btn"
              onClick={clear}
              disabled={text === ''}
            >
              지우기
            </button>
            <p className="koen__copy-status" role="status" aria-label="복사 안내">
              {copyState === 'copied' && '복사했어요.'}
              {copyState === 'failed' &&
                '복사하지 못했어요. 결과를 직접 선택해 복사해 주세요.'}
            </p>
          </div>
        </section>
      </main>

      <footer className="app__footer">
        <p>입력한 글자는 이 브라우저 안에서만 바뀌며, 어디에도 저장하거나 전송하지 않아요.</p>
      </footer>
    </div>
  );
}
