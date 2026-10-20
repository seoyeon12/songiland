/** 송이랜드에 붙는 도메인 앱의 종류. URL 첫 구간(`/games`, `/tools`)을 정한다. */
export type DomainKind = 'game' | 'tool';

export interface DomainEntry {
  /** URL 마지막 구간이자 앱 식별자. */
  id: string;
  kind: DomainKind;
  title: string;
  description: string;
}

const KIND_SEGMENT: Record<DomainKind, string> = {
  game: 'games',
  tool: 'tools',
};

/** 송이랜드 도메인 목록. 포털 카드와 앱 간 링크가 이 목록을 기준으로 만들어진다. */
export const domains = [
  {
    id: 'lotto',
    kind: 'game',
    title: '송이의 행운 로또쇼',
    description: '1~45 중 6개 번호를 재미로 뽑는 3D 게임쇼',
  },
] as const satisfies readonly DomainEntry[];

export type DomainId = (typeof domains)[number]['id'];

export function domainPath(entry: Pick<DomainEntry, 'id' | 'kind'>): string {
  return `/${KIND_SEGMENT[entry.kind]}/${entry.id}`;
}

/**
 * 도메인 앱이 배포되는 디렉터리 경로(끝에 `/`). Vite `base`, 라우터 basename, 포털 링크가
 * 모두 이 값을 쓴다. 끝 `/`가 없으면 dev 서버는 404, Pages는 한 번 더 리다이렉트한다.
 */
export function domainBase(entry: Pick<DomainEntry, 'id' | 'kind'>): string {
  return `${domainPath(entry)}/`;
}

export function getDomain(id: DomainId): DomainEntry {
  const entry = domains.find((domain) => domain.id === id);
  if (!entry) {
    throw new Error(`알 수 없는 송이랜드 도메인입니다: ${id}`);
  }
  return entry;
}

/** 로컬 포트를 쓰는 앱. 포털은 사이트 루트, 나머지는 도메인 앱이다. */
export type AppId = 'portal' | DomainId;

/**
 * 앱별 로컬 포트. dev는 `vite`, preview는 `vite preview`(e2e)용이다.
 * 포털 dev 서버는 각 도메인 경로를 해당 앱 dev 서버로 프록시해 한 origin처럼 보이게 한다.
 */
export const appPorts = {
  portal: { dev: 5173, preview: 4173 },
  lotto: { dev: 5174, preview: 4174 },
} as const satisfies Record<AppId, { dev: number; preview: number }>;
