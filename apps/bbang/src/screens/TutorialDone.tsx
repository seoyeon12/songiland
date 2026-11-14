/**
 * 튜토리얼을 끝낸 순간 판 위에 띄우는 완료 안내. 마지막으로 건넨 붕어빵이 보이도록 잠깐 뒤에
 * 나타나고(CSS), 진짜 장사에서 달라지는 점을 짚은 뒤 바로 장사를 시작하거나 처음 화면으로 간다.
 */
export function TutorialDone({ onDaily, onHome }: { onDaily: () => void; onHome: () => void }) {
  return (
    <div className="layer layer--late" role="dialog" aria-modal="true" aria-labelledby="tutorial-done-title">
      <section className="app__card layer__card">
        <h2 id="tutorial-done-title" className="layer__title">
          🎉 튜토리얼 완료!
        </h2>
        <p className="layer__lead">진짜 장사에서는 이런 점이 달라요.</p>
        <ul className="layer__list">
          <li>
            <strong>90초</strong> 동안 손님이 계속 와요. 기다리다 떠나면 ♥ 하나를 잃어요.
          </li>
          <li>기다리는 손님이 없는 소를 꺼내면 거치대에서 기다려요. 오래 두면 식어요.</li>
          <li>
            태워도 ♥ 하나. <strong>♥ 5개</strong>를 다 잃으면 장사 끝!
          </li>
        </ul>
        <div className="layer__actions">
          <button type="button" className="btn btn--primary btn--large" onClick={onDaily} autoFocus>
            오늘의 장사 시작
          </button>
          <button type="button" className="btn" onClick={onHome}>
            처음 화면으로
          </button>
        </div>
      </section>
    </div>
  );
}
