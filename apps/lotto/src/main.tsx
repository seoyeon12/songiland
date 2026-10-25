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

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
