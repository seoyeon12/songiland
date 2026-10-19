import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { LandingPage } from './pages/LandingPage';
import '@songiland/ui/base.css';
import './styles/global.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('루트 컨테이너(#root)를 찾을 수 없습니다.');
}

// 포털은 단일 화면이고 도메인 앱으로의 이동은 앱 경계를 넘는 전체 탐색이므로 라우터를 두지 않는다.
createRoot(container).render(
  <StrictMode>
    <LandingPage />
  </StrictMode>,
);
