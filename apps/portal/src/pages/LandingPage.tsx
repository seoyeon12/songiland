import { domainBase, domains, type DomainKind } from '@songiland/catalog';

const KIND_SECTIONS: ReadonlyArray<{ kind: DomainKind; title: string }> = [
  { kind: 'game', title: '게임' },
  { kind: 'tool', title: '도구' },
];

export function LandingPage() {
  return (
    <main className="portal">
      <header className="portal__hero">
        <h1>송이랜드</h1>
        <p className="portal__intro">
          보송한 비숑 송이가 진행하는 오락용 미니게임 랜드입니다.
        </p>
      </header>

      {KIND_SECTIONS.map(({ kind, title }) => {
        const entries = domains.filter((domain) => domain.kind === kind);
        if (entries.length === 0) {
          return null;
        }
        return (
          <section
            key={kind}
            className="portal__section"
            aria-labelledby={`portal-${kind}`}
          >
            <h2 id={`portal-${kind}`}>{title}</h2>
            <ul className="portal__cards">
              {entries.map((domain) => (
                // 도메인 앱은 별도 앱이므로 react-router Link가 아닌 일반 링크로 전체 탐색한다.
                <li key={domain.id}>
                  <a className="portal__card" href={domainBase(domain)}>
                    <span className="portal__card-title">{domain.title}</span>
                    <span className="portal__card-description">
                      {domain.description}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <footer className="portal__footer">
        <p>
          송이랜드의 모든 게임은 오락용입니다. 실제 복권 발행·판매·당첨 확인
          서비스가 아니며, 당첨을 보장하지 않습니다.
        </p>
      </footer>
    </main>
  );
}
