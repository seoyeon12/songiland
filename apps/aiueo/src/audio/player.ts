import type { KanaChar } from '../data/kana';
import { AUDIO_FILE_IDS } from './manifest';

/**
 * 소리를 어떻게 냈는지.
 * - `file`: 검수한 음원 파일
 * - `speech`: 임시 브라우저 음성(음원 파일이 아직 없는 문자)
 * - `unavailable`: 이 기기에서 낼 수 있는 소리가 없다
 */
export type PlayResult = 'file' | 'speech' | 'unavailable';

/** 문자 소리 재생기. 화면은 이 인터페이스만 쓴다(기획서 5장 `play(id)`). */
export interface KanaAudio {
  /** 반드시 터치·클릭 처리 안에서 부른다. iOS는 그 밖의 재생을 막는다. */
  play(kana: KanaChar): PlayResult;
}

/** 음원 파일 주소. 앱이 서브도메인 루트에서 동작하므로 절대 경로로 둔다. */
export function audioUrl(id: string): string {
  return `/audio/${id}.mp3`;
}

/** 임시 음성 속도. 초학자가 듣기 쉽게 조금 느리게 읽는다. */
export const SPEECH_RATE = 0.8;

type MinimalAudio = Pick<HTMLAudioElement, 'src' | 'currentTime' | 'play'>;

export type KanaAudioDeps = {
  fileIds?: ReadonlySet<string>;
  createAudio?: () => MinimalAudio;
  speech?: SpeechSynthesis | undefined;
  createUtterance?: (text: string) => SpeechSynthesisUtterance;
};

/** 목소리 목록에서 일본어 목소리를 고른다. 목록이 아직 비어 있으면 `undefined`. */
export function pickJapaneseVoice(
  voices: readonly SpeechSynthesisVoice[],
): SpeechSynthesisVoice | null | undefined {
  if (voices.length === 0) {
    return undefined;
  }
  return (
    voices.find((voice) => voice.lang.replace('_', '-').toLowerCase() === 'ja-jp') ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith('ja')) ??
    null
  );
}

function defaultSpeech(): SpeechSynthesis | undefined {
  try {
    return typeof window !== 'undefined' && 'speechSynthesis' in window
      ? window.speechSynthesis
      : undefined;
  } catch {
    return undefined;
  }
}

export function createKanaAudio({
  fileIds = AUDIO_FILE_IDS,
  createAudio = () => new Audio(),
  speech = defaultSpeech(),
  createUtterance = (text) => new SpeechSynthesisUtterance(text),
}: KanaAudioDeps = {}): KanaAudio {
  // 파일 재생기는 하나만 두고 주소만 바꾼다. 연달아 눌러도 소리가 겹치지 않는다.
  let audio: MinimalAudio | undefined;

  function playFile(id: string): PlayResult {
    audio ??= createAudio();
    audio.src = audioUrl(id);
    audio.currentTime = 0;
    void audio.play().catch(() => {
      // 자동 재생 정책이나 일시적 네트워크 오류. 다시 누르면 된다.
    });
    return 'file';
  }

  function speak(kana: KanaChar): PlayResult {
    if (!speech) {
      return 'unavailable';
    }
    const voice = pickJapaneseVoice(speech.getVoices());
    // 목록을 다 받았는데 일본어 목소리가 없으면 다른 언어 목소리로 엉뚱하게 읽으니 읽지 않는다.
    if (voice === null) {
      return 'unavailable';
    }
    speech.cancel();
    const utterance = createUtterance(kana.char);
    utterance.lang = 'ja-JP';
    utterance.rate = SPEECH_RATE;
    if (voice) {
      utterance.voice = voice;
    }
    speech.speak(utterance);
    return 'speech';
  }

  return {
    play(kana) {
      return fileIds.has(kana.id) ? playFile(kana.id) : speak(kana);
    },
  };
}
