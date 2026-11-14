import { useEffect, useRef } from 'react';

/**
 * 장사 도중 뒤로가기(또는 Esc)를 누르면 띄우는 확인 레이어. 묻는 동안 장사 시계는 멈춘다.
 * 그만두면 이 판은 기록·고스트·포인트 어디에도 남지 않는다. Esc는 "계속 장사하기"다.
 */
export function QuitConfirm({
  daily,
  score,
  onContinue,
  onQuit,
}: {
  daily: boolean;
  score: number;
  onContinue: () => void;
  onQuit: () => void;
}) {
  const onContinueRef = useRef(onContinue);
  useEffect(() => {
    onContinueRef.current = onContinue;
  });
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code === 'Escape') {
        event.preventDefault();
        onContinueRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div
      className="layer"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="quit-title"
      aria-describedby="quit-lead"
    >
      <section className="app__card layer__card">
        <h2 id="quit-title" className="layer__title">
          {daily ? '오늘의 장사를 그만둘까요?' : '영업을 그만둘까요?'}
        </h2>
        <p id="quit-lead" className="layer__lead">
          지금까지 번 <strong>{score.toLocaleString('ko-KR')}점</strong>은{' '}
          {daily ? '오늘 기록에 남지 않고' : '기록에 남지 않고'}, 번 돈도 포인트로 쌓이지 않아요.
          묻는 동안 장사 시계는 멈춰 있어요.
        </p>
        <div className="layer__actions">
          <button type="button" className="btn btn--primary btn--large" onClick={onContinue} autoFocus>
            계속 장사하기
          </button>
          <button type="button" className="btn btn--danger-outline" onClick={onQuit}>
            그만두기
          </button>
        </div>
      </section>
    </div>
  );
}
