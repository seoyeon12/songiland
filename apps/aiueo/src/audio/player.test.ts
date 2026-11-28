import { getKana, type KanaChar } from '../data/kana';
import { audioUrl, createKanaAudio, pickJapaneseVoice, SPEECH_RATE } from './player';

const KA = getKana('hiragana-ka') as KanaChar;

function voice(lang: string, name = lang): SpeechSynthesisVoice {
  return { lang, name, default: false, localService: true, voiceURI: name };
}

function fakeSpeech(voices: SpeechSynthesisVoice[]) {
  return {
    getVoices: vi.fn(() => voices),
    cancel: vi.fn(),
    speak: vi.fn(),
  } as unknown as SpeechSynthesis & {
    speak: ReturnType<typeof vi.fn>;
    cancel: ReturnType<typeof vi.fn>;
  };
}

function utterance(text: string) {
  return { text, lang: '', rate: 1, voice: null } as unknown as SpeechSynthesisUtterance;
}

describe('kana audio', () => {
  it('plays the reviewed file when one exists', () => {
    const fake = { src: '', currentTime: 5, play: vi.fn(() => Promise.resolve()) };
    const speech = fakeSpeech([voice('ja-JP')]);
    const audio = createKanaAudio({
      fileIds: new Set([KA.id]),
      createAudio: () => fake,
      speech,
      createUtterance: utterance,
    });
    expect(audio.play(KA)).toBe('file');
    expect(fake.src).toBe(audioUrl(KA.id));
    expect(fake.currentTime).toBe(0);
    expect(fake.play).toHaveBeenCalledOnce();
    expect(speech.speak).not.toHaveBeenCalled();
  });

  it('falls back to a Japanese browser voice until the file exists', () => {
    const ja = voice('ja-JP', 'Kyoko');
    const speech = fakeSpeech([voice('ko-KR'), ja]);
    const audio = createKanaAudio({ fileIds: new Set(), speech, createUtterance: utterance });
    expect(audio.play(KA)).toBe('speech');
    expect(speech.cancel).toHaveBeenCalledOnce();
    const spoken = speech.speak.mock.calls[0]?.[0] as SpeechSynthesisUtterance;
    expect(spoken).toMatchObject({ text: 'か', lang: 'ja-JP', rate: SPEECH_RATE, voice: ja });
  });

  it('still speaks with lang ja-JP while the voice list is loading', () => {
    const speech = fakeSpeech([]);
    const audio = createKanaAudio({ fileIds: new Set(), speech, createUtterance: utterance });
    expect(audio.play(KA)).toBe('speech');
    expect(speech.speak).toHaveBeenCalledOnce();
  });

  it('stays silent rather than reading kana with a non-Japanese voice', () => {
    const speech = fakeSpeech([voice('ko-KR'), voice('en-US')]);
    const audio = createKanaAudio({ fileIds: new Set(), speech, createUtterance: utterance });
    expect(audio.play(KA)).toBe('unavailable');
    expect(speech.speak).not.toHaveBeenCalled();
  });

  it('reports unavailable without speech synthesis', () => {
    const audio = createKanaAudio({ fileIds: new Set(), speech: undefined });
    expect(audio.play(KA)).toBe('unavailable');
  });
});

describe('canPlay', () => {
  it('says yes for a reviewed file or a Japanese voice, and while voices are loading', () => {
    expect(createKanaAudio({ fileIds: new Set([KA.id]), speech: undefined }).canPlay(KA)).toBe(true);
    const withJa = createKanaAudio({ fileIds: new Set(), speech: fakeSpeech([voice('ja-JP')]) });
    expect(withJa.canPlay(KA)).toBe(true);
    const loading = createKanaAudio({ fileIds: new Set(), speech: fakeSpeech([]) });
    expect(loading.canPlay(KA)).toBe(true);
  });

  it('says no without speech synthesis or without a Japanese voice', () => {
    expect(createKanaAudio({ fileIds: new Set(), speech: undefined }).canPlay(KA)).toBe(false);
    const noJa = createKanaAudio({ fileIds: new Set(), speech: fakeSpeech([voice('en-US')]) });
    expect(noJa.canPlay(KA)).toBe(false);
  });
});

describe('pickJapaneseVoice', () => {
  it('prefers ja-JP, accepts other ja tags, and tells loading apart from missing', () => {
    expect(pickJapaneseVoice([])).toBeUndefined();
    expect(pickJapaneseVoice([voice('en-US')])).toBeNull();
    expect(pickJapaneseVoice([voice('ja'), voice('ja_JP', 'android')])?.name).toBe('android');
    expect(pickJapaneseVoice([voice('ja')])?.lang).toBe('ja');
  });
});
