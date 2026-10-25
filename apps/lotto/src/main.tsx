import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@songiland/ui/base.css';
import { LottoGame } from './features/lotto/LottoGame';

const container = document.getElementById('root');
if (!container) {
  throw new Error('루트 컨테이너(#root)를 찾을 수 없습니다.');
}

// 화면이 하나뿐이라 라우터를 두지 않는다. Pages SPA 폴백 덕분에 어떤 경로로 들어와도
// 같은 index.html이 열리고 로또쇼가 보인다.
createRoot(container).render(
  <StrictMode>
    <LottoGame />
  </StrictMode>,
);
