import { Navigate, Route, Routes } from 'react-router-dom';
import { LottoGame } from '../features/lotto/LottoGame';

// 라우터 basename이 `/games/lotto/`를 떼어 주므로 앱 안에서는 루트가 곧 로또쇼다.
// 송이랜드 소개(`/`)는 별도 앱 apps/portal이 맡는다.
export function App() {
  return (
    <Routes>
      <Route path="/" element={<LottoGame />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
