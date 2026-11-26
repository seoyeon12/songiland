import { appUrl } from '@songiland/catalog';
import { HIRAGANA_SEION, HIRAGANA_SEION_ROWS } from '../data/kana';
import { KanaChart } from '../features/chart/KanaChart';
import './app.css';

// 로컬 dev 서버에서는 포털 dev 서버로, 배포본에서는 songiland.arosys.kr로 돌아간다.
const PORTAL_URL = appUrl('portal', import.meta.env.DEV ? 'local' : 'production');

/** 아이우에오 앱. 0단계에서는 히라가나 청음 문자표 한 화면이다. */
export function App() {
  return (
    <div className="app aiueo">
      <nav className="app__topbar" aria-label="송이랜드">
        <a className="app__home" href={PORTAL_URL}>
          <span aria-hidden>←</span> 송이랜드
        </a>
      </nav>

      <main className="app__main aiueo__main">
        <header className="app__header">
          <span className="app__eyebrow">
            <span aria-hidden>🗾</span> 일본어 첫 글자
          </span>
          <h1 className="app__title">아이우에오</h1>
          <p className="app__subtitle">
            히라가나 46자부터 차근차근. 보고, 듣고, 써 보며 익혀요.
          </p>
        </header>

        <section className="aiueo__section" aria-labelledby="aiueo-seion">
          <div className="aiueo__section-head">
            <h2 id="aiueo-seion" className="aiueo__section-title">
              히라가나 <span lang="ja">ひらがな</span>
            </h2>
            <span className="aiueo__count">청음 {HIRAGANA_SEION.length}자</span>
          </div>
          <KanaChart caption="히라가나 청음 오십음도" rows={HIRAGANA_SEION_ROWS} />
        </section>
      </main>

      <footer className="app__footer">
        <p>발음 표기는 헵번식 로마자예요. 한글은 비슷한 소리를 적은 참고용이에요.</p>
      </footer>
    </div>
  );
}
