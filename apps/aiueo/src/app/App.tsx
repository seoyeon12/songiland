import { appUrl } from '@songiland/catalog';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { createKanaAudio, type KanaAudio, type PlayResult } from '../audio/player';
import { TabBar } from '../components/TabBar';
import { HIRAGANA_SEION, type KanaChar } from '../data/kana';
import { dayKey } from '../progress/mastery';
import { createProgressStore, type ProgressStore, type StudyMode } from '../progress/store';
import { ChartScreen } from '../screens/ChartScreen';
import { DeckScreen } from '../screens/DeckScreen';
import { MineScreen } from '../screens/MineScreen';
import { QuizScreen } from '../screens/QuizScreen';
import { StudyScreen } from '../screens/StudyScreen';
import { bookmarkedKana, MINE_RANGE_ID, newShuffleSeed, type StudyProgress } from '../study/ranges';
import { useRoute, type QuizRoute, type Route } from './router';
import './app.css';

// 로컬 dev 서버에서는 포털 dev 서버로, 배포본에서는 songiland.arosys.kr로 돌아간다.
const PORTAL_URL = appUrl('portal', import.meta.env.DEV ? 'local' : 'production');

const SOUND_UNAVAILABLE = '이 기기에서는 아직 소리를 낼 수 없어요.';

const systemNow = () => new Date();

export type AppProps = {
  /** 소리 재생기. 테스트에서 가짜를 넣는다. */
  audio?: KanaAudio;
  /** 학습 기록 저장소. 테스트에서 가짜를 넣는다. */
  store?: ProgressStore;
  /** 지금 시각. 숙련도·복습일 계산에 쓴다. 테스트에서 고정 시각을 넣는다. */
  now?: () => Date;
};

/** 아이우에오 앱. 하단 탭(문자표·학습·내 문자)과 그 위에 쌓이는 카드 넘기기·퀴즈 화면. */
export function App(props: AppProps) {
  const [audio] = useState(() => props.audio ?? createKanaAudio());
  const [store] = useState(() => props.store ?? createProgressStore());
  const now = props.now ?? systemNow;
  const bookmarks = useSyncExternalStore(store.subscribe, store.bookmarks);
  const mastery = useSyncExternalStore(store.subscribe, store.mastery);
  const settings = useSyncExternalStore(store.subscribe, store.settings);
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

  const progress: StudyProgress = { mastery: mastery.reading, today: dayKey(now()) };
  const soundSupported = HIRAGANA_SEION.every((kana) => audio.canPlay(kana));

  function go(next: Route, how: 'push' | 'replace') {
    navigate(next, how);
    window.scrollTo(0, 0);
  }

  /** 소리는 반드시 이 함수로, 터치·클릭 처리 안에서 낸다. */
  function play(kana: KanaChar): PlayResult {
    const result = audio.play(kana);
    if (result === 'unavailable') {
      setNotice(SOUND_UNAVAILABLE);
    }
    return result;
  }

  /** 글자를 누르면 소리를 내고 그 글자 카드를 뒷면(발음)으로 연다. */
  function openCard(kana: KanaChar, range: string) {
    play(kana);
    go({ screen: 'deck', range, at: kana.id, reveal: true }, 'push');
  }

  function quizRoute(range: string, mode: 'read' | 'listen'): QuizRoute {
    return {
      screen: 'quiz',
      range,
      mode,
      choices: mode === 'read' && soundSupported ? settings.quizChoices : 'romaji',
      shuffle: newShuffleSeed(),
    };
  }

  function startStudy(range: string, mode: StudyMode, shuffle: boolean) {
    if (mode === 'cards') {
      go({ screen: 'deck', range, shuffle: shuffle ? newShuffleSeed() : undefined }, 'push');
    } else {
      go(quizRoute(range, mode), 'push');
    }
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
          progress={progress}
          onToggleBookmark={store.toggleBookmark}
          onPlay={play}
          onMove={(at) =>
            navigate({ screen: 'deck', range: route.range, shuffle: route.shuffle, at }, 'replace')
          }
          onBack={() => back({ screen: 'study' })}
        />
        {noticeRegion}
      </>
    );
  }

  if (route.screen === 'quiz') {
    return (
      <>
        <QuizScreen
          // 범위·방식·보기·시드가 바뀌면(한 판 더 포함) 문제 목록을 새로 만든다.
          key={`${route.range}:${route.mode}:${route.choices}:${route.shuffle ?? 0}`}
          route={route}
          bookmarks={bookmarks}
          progress={progress}
          soundSupported={soundSupported}
          onPlay={play}
          onAnswer={(kana, correct) => store.recordAnswer('reading', kana.id, correct, now())}
          onToggleBookmark={store.toggleBookmark}
          onRestart={() => go({ ...route, shuffle: newShuffleSeed() }, 'replace')}
          onSwitchToRead={() =>
            go({ ...route, mode: 'read', choices: 'romaji' }, 'replace')
          }
          onBack={() => back({ screen: 'study' })}
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
          <ChartScreen
            bookmarks={bookmarks}
            mastery={mastery.reading}
            onSelect={(kana) => openCard(kana, 'seion')}
          />
        )}
        {route.screen === 'study' && (
          <StudyScreen
            bookmarks={bookmarks}
            progress={progress}
            mode={settings.studyMode}
            choices={settings.quizChoices}
            soundSupported={soundSupported}
            onModeChange={(studyMode) => store.updateSettings({ studyMode })}
            onChoicesChange={(quizChoices) => store.updateSettings({ quizChoices })}
            onStart={startStudy}
          />
        )}
        {route.screen === 'mine' && (
          <MineScreen
            bookmarks={bookmarks}
            persistence={store.persistence}
            onSelect={(kana) => openCard(kana, MINE_RANGE_ID)}
            onStart={() => go({ screen: 'deck', range: MINE_RANGE_ID }, 'push')}
            onQuiz={() => go(quizRoute(MINE_RANGE_ID, 'read'), 'push')}
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
