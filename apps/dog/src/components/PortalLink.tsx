import { appUrl } from '@songiland/catalog';

// 로컬 dev 서버에서는 포털 dev 서버로, 배포본에서는 songiland.arosys.kr로 돌아간다.
const PORTAL_URL = appUrl('portal', import.meta.env.DEV ? 'local' : 'production');

export function PortalLink() {
  return (
    <a className="app__home" href={PORTAL_URL}>
      <span aria-hidden>←</span> 송이랜드
    </a>
  );
}
