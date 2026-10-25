import { Navigate, Route, Routes } from 'react-router-dom';
import { LottoGame } from '../features/lotto/LottoGame';

// 이 앱은 lotto.arosys.kr 루트에서 동작하므로 `/`가 곧 로또쇼다.
// 송이랜드 소개는 별도 앱 apps/portal(songiland.arosys.kr)이 맡는다.
export function App() {
  return (
    <Routes>
      <Route path="/" element={<LottoGame />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
