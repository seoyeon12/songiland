import { appUrl } from '@songiland/catalog';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { createKanaAudio, type KanaAudio } from '../audio/player';
import { TabBar } from '../components/TabBar';
import type { KanaChar } from '../data/kana';
import { createProgressStore, type ProgressStore } from '../progress/store';
import { CardsScreen } from '../screens/CardsScreen';
import { ChartScreen } from '../screens/ChartScreen';
import { DeckScreen } from '../screens/DeckScreen';
import { MineScreen } from '../screens/MineScreen';
import { bookmarkedKana, MINE_RANGE_ID, newShuffleSeed } from '../study/ranges';
import { useRoute, type Route } from './router';
import './app.css';

// 로컬 dev 서버에서는 포털 dev 서버로, 배포본에서는 songiland.arosys.kr로 돌아간다.
const PORTAL_URL = appUrl('portal', import.meta.env.DEV ? 'local' : 'production');

const SOUND_UNAVAILABLE = '이 기기에서는 아직 소리를 낼 수 없어요.';

export type AppProps = {
  /** 소리 재생기. 테스트에서 가짜를 넣는다. */
  audio?: KanaAudio;
  /** 학습 기록 저장소. 테스트에서 가짜를 넣는다. */
  store?: ProgressStore;
};

/** 아이우에오 앱. 하단 탭(문자표·카드·내 문자)과 그 위에 쌓이는 카드 넘기기 화면. */
export function App(props: AppProps) {
  const [audio] = useState(() => props.audio ?? createKanaAudio());
  const [store] = useState(() => props.store ?? createProgressStore());
  const bookmarks = useSyncExternalStore(store.subscribe, store.bookmarks);
  const { route, navigate, back } = useRoute();
  const [notice, setNotice] = useState<string | null>(null);

  // 안내는 잠깐만 보여 준다.
  useEffect(() => {
    if (!notice) {
      return;
    }
    const timer = window.setTimeout(() => setNotice(null), 3000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function go(next: Route, how: 'push' | 'replace') {
    navigate(next, how);
    window.scrollTo(0, 0);
  }

  /** 소리는 반드시 이 함수로, 터치·클릭 처리 안에서 낸다. */
  function play(kana: KanaChar) {
    if (audio.play(kana) === 'unavailable') {
      setNotice(SOUND_UNAVAILABLE);
    }
  }

  /** 글자를 누르면 소리를 내고 그 글자 카드를 뒷면(발음)으로 연다. */
  function openCard(kana: KanaChar, range: string) {
    play(kana);
    go({ screen: 'deck', range, at: kana.id, reveal: true }, 'push');
  }

  const noticeRegion = (
    <div className="aiueo__notice-region" role="status">
      {notice && <p className="aiueo__notice">{notice}</p>}
    </div>
  );

  if (route.screen === 'deck') {
    return (
      <>
        <DeckScreen
          // 다른 묶음이나 다른 섞기로 바뀌면 카드 목록을 새로 만든다.
          key={`${route.range}:${route.shuffle ?? 0}`}
          route={route}
          bookmarks={bookmarks}
          onToggleBookmark={store.toggleBookmark}
          onPlay={play}
          onMove={(at) =>
            navigate({ screen: 'deck', range: route.range, shuffle: route.shuffle, at }, 'replace')
          }
          onBack={() => back({ screen: 'cards' })}
        />
        {noticeRegion}
      </>
    );
  }

  return (
    <div className="app aiueo aiueo--tabs">
      <nav className="app__topbar" aria-label="송이랜드">
        <a className="app__home" href={PORTAL_URL}>
          <span aria-hidden>←</span> 송이랜드
        </a>
      </nav>

      <main className="app__main aiueo__main">
        {route.screen === 'chart' && (
          <ChartScreen bookmarks={bookmarks} onSelect={(kana) => openCard(kana, 'seion')} />
        )}
        {route.screen === 'cards' && (
          <CardsScreen
            bookmarks={bookmarks}
            onStart={(range, shuffle) =>
              go(
                { screen: 'deck', range, shuffle: shuffle ? newShuffleSeed() : undefined },
                'push',
              )
            }
          />
        )}
        {route.screen === 'mine' && (
          <MineScreen
            bookmarks={bookmarks}
            persistence={store.persistence}
            onSelect={(kana) => openCard(kana, MINE_RANGE_ID)}
            onStart={() => go({ screen: 'deck', range: MINE_RANGE_ID }, 'push')}
          />
        )}
      </main>

      <TabBar
        current={route.screen}
        mineCount={bookmarkedKana(bookmarks).length}
        onSelect={(tab) => go({ screen: tab }, 'replace')}
      />
      {noticeRegion}
    </div>
  );
}
