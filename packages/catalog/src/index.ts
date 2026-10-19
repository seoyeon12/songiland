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

export function getDomain(id: DomainId): DomainEntry {
  const entry = domains.find((domain) => domain.id === id);
  if (!entry) {
    throw new Error(`알 수 없는 송이랜드 도메인입니다: ${id}`);
  }
  return entry;
}
