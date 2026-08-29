import { Link } from 'react-router-dom';

export function LandingPage() {
  return (
    <main className="landing">
      <h1>송이랜드</h1>
      <p className="landing__intro">
        보송한 비숑 송이가 진행하는 오락용 미니게임 랜드입니다.
      </p>
      <Link className="landing__cta" to="/games/lotto">
        첫 번째 게임: 송이의 행운 로또쇼
      </Link>
    </main>
  );
}
