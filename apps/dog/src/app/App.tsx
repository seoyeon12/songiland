import { useEffect, useState } from 'react';
import { startRun, type RunState } from '../engine';
import { EndingScreen } from '../screens/EndingScreen';
import { MeetingScreen } from '../screens/MeetingScreen';
import { PlayScreen } from '../screens/PlayScreen';
import { StartScreen } from '../screens/StartScreen';
import { createRunStore, type PastLife, type RunStore } from './storage';
import './app.css';

function cryptoSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0];
}

export type AppProps = {
  /** Test seam: 저장소 */
  store?: RunStore;
  /** Test seam: 만남 시드 */
  randomSeed?: () => number;
};

type Screen =
  | { kind: 'start' }
  | { kind: 'meeting'; seed: number }
  | { kind: 'playing' }
  | { kind: 'past'; life: PastLife };

/** 견생극장: 시작 → 만남 → 진행(선택 카드) → 결말. 끝난 판은 지난 견생 목록에 남는다. */
export function App({ store: injectedStore, randomSeed = cryptoSeed }: AppProps) {
  const [store] = useState<RunStore>(() => injectedStore ?? createRunStore());
  const [screen, setScreen] = useState<Screen>({ kind: 'start' });
  const [run, setRun] = useState<RunState | null>(null);
  const [saved, setSaved] = useState<RunState | null>(() => {
    const loaded = store.load();
    return loaded && loaded.status === 'running' ? loaded : null;
  });
  const [lives, setLives] = useState<PastLife[]>(() => store.pastLives());

  // 진행 상황을 달마다 저장해 두어 창을 닫았다 열어도 이어 볼 수 있게 한다. 끝난 판은 지난 견생으로 옮긴다.
  useEffect(() => {
    if (run?.status === 'ended') {
      store.remember(run);
      store.clear();
    } else if (run) {
      store.save(run);
    }
  }, [run, store]);

  function backToStart() {
    store.clear();
    setRun(null);
    setSaved(null);
    setLives(store.pastLives());
    setScreen({ kind: 'start' });
  }

  if (run && run.status === 'ended') {
    return <EndingScreen run={run} onAgain={backToStart} />;
  }

  if (screen.kind === 'playing' && run) {
    return (
      <PlayScreen
        run={run}
        onChange={(update) => setRun((current) => (current ? update(current) : current))}
        memoryOnly={store.persistence === 'memory'}
      />
    );
  }

  if (screen.kind === 'past') {
    return (
      <EndingScreen
        run={screen.life.run}
        endedAt={screen.life.endedAt}
        onAgain={() => setScreen({ kind: 'start' })}
      />
    );
  }

  if (screen.kind === 'meeting') {
    return (
      <MeetingScreen
        seed={screen.seed}
        onAdopt={(name) => {
          setRun(startRun({ seed: screen.seed, name }));
          setScreen({ kind: 'playing' });
        }}
        onBack={() => setScreen({ kind: 'start' })}
      />
    );
  }

  return (
    <StartScreen
      saved={saved}
      lives={lives}
      onOpenLife={(life) => {
        // 목록 아래쪽에서 열어도 기록 카드 맨 위부터 보이게 한다.
        window.scrollTo(0, 0);
        setScreen({ kind: 'past', life });
      }}
      onMeet={() => setScreen({ kind: 'meeting', seed: randomSeed() })}
      onResume={() => {
        setRun(saved);
        setScreen({ kind: 'playing' });
      }}
    />
  );
}
