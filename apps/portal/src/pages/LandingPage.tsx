import { appUrl, domains, type DomainKind } from '@songiland/catalog';

const KIND_SECTIONS: ReadonlyArray<{ kind: DomainKind; title: string }> = [
  { kind: 'game', title: '게임' },
  { kind: 'tool', title: '도구' },
];

export type LandingPageProps = {
  /**
   * 카드 링크가 가리킬 곳. 배포본은 각 앱의 서브도메인(https://<이름>.arosys.kr/),
   * 로컬 dev 서버는 각 앱의 localhost 포트로 보낸다.
   */
  linkTarget?: 'production' | 'local';
};

export function LandingPage({
  linkTarget = import.meta.env.DEV ? 'local' : 'production',
}: LandingPageProps) {
  return (
    <div className="app portal">
      <main className="app__main portal__main">
        <header className="portal__hero">
          <span className="portal__mascot" aria-hidden>
            🐶
          </span>
          <h1 className="app__title">송이랜드</h1>
          <p className="app__subtitle">
            보송한 비숑 송이가 진행하는 작은 놀이터예요. 가볍게 즐기는 게임과
            쓸모 있는 도구를 모아 두었어요.
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
              <h2 id={`portal-${kind}`} className="portal__section-title">
                {title}
              </h2>
              <ul className="portal__cards">
                {entries.map((domain) => (
                  // 도메인 앱은 다른 서브도메인의 별도 앱이므로 일반 링크로 전체 탐색한다.
                  <li key={domain.id}>
                    <a className="portal__card" href={appUrl(domain.id, linkTarget)}>
                      <span className="portal__card-icon" aria-hidden>
                        {domain.emoji}
                      </span>
                      <span className="portal__card-body">
                        <span className="portal__card-title">{domain.title}</span>
                        <span className="portal__card-description">
                          {domain.description}
                        </span>
                      </span>
                      <span className="portal__card-arrow" aria-hidden>
                        →
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </main>
    </div>
  );
}
