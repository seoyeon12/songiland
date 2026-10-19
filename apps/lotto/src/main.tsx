import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './app/App';
import '@songiland/ui/base.css';
import './styles/global.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('루트 컨테이너(#root)를 찾을 수 없습니다.');
}

// BASE_URL은 vite.config.ts의 base(`/games/lotto/`)로, 앱 안의 경로는 모두 그 아래에서 해석된다.
createRoot(container).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
