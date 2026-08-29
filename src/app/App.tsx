import { Route, Routes } from 'react-router-dom';
import { LottoGame } from '../features/lotto/LottoGame';
import { LandingPage } from '../pages/LandingPage';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/games/lotto" element={<LottoGame />} />
    </Routes>
  );
}
