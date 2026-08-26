import { Link } from 'react-router-dom';

export function LandingPage() {
  return (
    <main>
      <h1>송이랜드</h1>
      <Link to="/games/lotto">첫 번째 게임: 송이의 행운 로또쇼</Link>
    </main>
  );
}
