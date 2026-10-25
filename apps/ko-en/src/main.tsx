import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@songiland/ui/base.css';
import { KoEnConverter } from './features/converter/KoEnConverter';

const container = document.getElementById('root');
if (!container) {
  throw new Error('루트 컨테이너(#root)를 찾을 수 없습니다.');
}

createRoot(container).render(
  <StrictMode>
    <KoEnConverter />
  </StrictMode>,
);
