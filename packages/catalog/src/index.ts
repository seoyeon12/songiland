/** 송이랜드 도메인 앱의 종류. 포털에서 카드를 묶는 기준이다. */
export type DomainKind = 'game' | 'tool';

export interface DomainEntry {
  /** 앱 식별자. 앱 폴더 이름(`apps/<id>`)과 같다. */
  id: string;
  kind: DomainKind;
  title: string;
  description: string;
  /** 포털 카드에 쓰는 이모지 아이콘 하나. */
  emoji: string;
}

/** 송이랜드 도메인 목록. 포털 카드와 앱 간 링크가 이 목록을 기준으로 만들어진다. */
export const domains = [
  {
    id: 'lotto',
    kind: 'game',
    title: '송이의 행운 로또쇼',
    description: '1~45 중 6개 번호를 재미로 골라 주는 번호 추천',
    emoji: '🍀',
  },
  {
    id: 'ko-en',
    kind: 'tool',
    title: '한영타 변환기',
    description: '한/영 키를 잘못 누른 채 친 글자를 바로 되돌려 주는 도구',
    emoji: '⌨️',
  },
] as const satisfies readonly DomainEntry[];

export type DomainId = (typeof domains)[number]['id'];

export function getDomain(id: DomainId): DomainEntry {
  const entry = domains.find((domain) => domain.id === id);
  if (!entry) {
    throw new Error(`알 수 없는 송이랜드 도메인입니다: ${id}`);
  }
  return entry;
}

/** 배포 앱. 포털과 도메인 앱 모두 Cloudflare Pages 프로젝트 하나씩을 차지한다. */
export type AppId = 'portal' | DomainId;

/** 모든 앱이 서브도메인으로 붙는 상위 도메인. */
export const SITE_DOMAIN = 'arosys.kr';

export interface AppHost {
  /** 배포 주소 `https://<subdomain>.arosys.kr/`의 앞부분. */
  subdomain: string;
  /** 로컬 `vite` 포트. */
  devPort: number;
  /** 로컬 `vite preview` 포트. e2e가 이 포트로 빌드 결과를 띄운다. */
  previewPort: number;
}

/** 앱별 배포 서브도메인과 로컬 포트. 새 앱을 붙이면 여기에 한 줄 추가한다. */
export const appHosts = {
  portal: { subdomain: 'songiland', devPort: 5173, previewPort: 4173 },
  lotto: { subdomain: 'lotto', devPort: 5174, previewPort: 4174 },
  'ko-en': { subdomain: 'ko-en', devPort: 5175, previewPort: 4175 },
} as const satisfies Record<AppId, AppHost>;

/**
 * 앱 주소. 각 앱은 자기 서브도메인의 루트(`/`)에서 동작한다.
 * - production: `https://<subdomain>.arosys.kr/`
 * - local: `http://localhost:<devPort>/` (로컬 dev 서버끼리 오갈 때)
 */
export function appUrl(
  app: AppId,
  target: 'production' | 'local' = 'production',
): string {
  const host = appHosts[app];
  return target === 'local'
    ? `http://localhost:${host.devPort}/`
    : `https://${host.subdomain}.${SITE_DOMAIN}/`;
}
