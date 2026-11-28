import { useState } from 'react';
import type { QuizRoute } from '../app/router';
import type { PlayResult } from '../audio/player';
import type { KanaChar } from '../data/kana';
import { buildQuiz, type Question } from '../features/quiz/questions';
import {
  MINE_RANGE_ID,
  resolveRange,
  REVIEW_RANGE_ID,
  WEAK_RANGE_ID,
  type StudyProgress,
} from '../study/ranges';
import './deck.css';
import './quiz.css';

export type QuizScreenProps = {
  route: QuizRoute;
  bookmarks: ReadonlySet<string>;
  /** 문제를 고를 때 쓰는 읽기 숙련도와 오늘 날짜. 시작할 때 한 번만 읽는다. */
  progress: StudyProgress;
  /** 미리 확인한 결과로 이 기기에서 일본어 소리를 낼 수 있는가. */
  soundSupported: boolean;
  /** 소리 재생. 반드시 터치·클릭 처리 안에서 부른다(iOS). */
  onPlay: (kana: KanaChar) => PlayResult;
  /** 답 하나를 숙련도에 반영한다. */
  onAnswer: (kana: KanaChar, correct: boolean) => void;
  onToggleBookmark: (id: string) => void;
  /** 같은 범위·방식으로 새로 섞어 한 판 더. */
  onRestart: () => void;
  /** 소리를 낼 수 없어 듣고 고르기를 못 할 때, 문자 보고 고르기(로마자)로 바꾼다. */
  onSwitchToRead: () => void;
  onBack: () => void;
};

type Result = { kana: KanaChar; correct: boolean };

/** 주소에 시드가 없을 때(바로 들어온 경우) 쓰는 고정 시드. */
const FALLBACK_SEED = 1;

const EMPTY_TEXT: Record<string, string> = {
  [MINE_RANGE_ID]: '담은 문자가 없어요. 문자표나 카드에서 ☆를 눌러 담아 보세요.',
  [REVIEW_RANGE_ID]: '오늘 복습할 문자가 없어요.',
  [WEAK_RANGE_ID]: '약한 문자가 없어요. 퀴즈를 풀면 자주 틀린 문자가 여기에 모여요.',
};

/**
 * 문자 퀴즈(기획서 6.4). 4지선다.
 * - `read`: 문자를 보고 발음 고르기. 보기는 로마자, 또는 표기 없는 소리 버튼(눌러 듣고 "이걸로").
 * - `listen`: 소리를 듣고 문자 고르기. 첫 문제도 ▶ 듣기를 눌러야 시작한다(iOS는 자동 재생을 막는다).
 *   다음 문제 소리는 "다음 문제" 버튼을 누른 그 처리 안에서 바로 낸다.
 *
 * 문제 목록은 시작할 때 고정한다. 풀다가 ★를 바꾸거나 숙련도가 바뀌어도 이번 판은 그대로다.
 */
export function QuizScreen({
  route,
  bookmarks,
  progress,
  soundSupported,
  onPlay,
  onAnswer,
  onToggleBookmark,
  onRestart,
  onSwitchToRead,
  onBack,
}: QuizScreenProps) {
  const [quiz] = useState(() => {
    const range = resolveRange(route.range, bookmarks, progress);
    if (!range) {
      return null;
    }
    const questions = buildQuiz(range.kana, {
      seed: route.shuffle ?? FALLBACK_SEED,
      mastery: progress.mastery,
      today: progress.today,
    });
    return { label: range.label, questions };
  });
  const [index, setIndex] = useState(0);
  /** 소리 보기에서 듣고 고른(아직 내지 않은) 보기. */
  const [picked, setPicked] = useState<string | null>(null);
  /** 낸 답. 내면 정답·오답을 보여 주고 "다음"을 기다린다. */
  const [chosen, setChosen] = useState<string | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  /** 듣고 고르기에서 이 문제 소리를 들었는가. 듣기 전에는 보기를 누를 수 없다. */
  const [heard, setHeard] = useState(false);
  /** 소리를 낼 수 없다고 확인됐다. 소리 보기는 로마자로, 듣고 고르기는 안내로 바꾼다. */
  const [soundBroken, setSoundBroken] = useState(!soundSupported);
  const [announcement, setAnnouncement] = useState('');

  const questions = quiz?.questions ?? [];
  const question: Question | undefined = questions[index];
  const done = quiz !== null && questions.length > 0 && index >= questions.length;
  const style = route.mode === 'read' && route.choices === 'sound' && !soundBroken ? 'sound' : 'romaji';
  const listenBlocked = route.mode === 'listen' && soundBroken;

  /** 소리를 내고, 낼 수 없으면 `false`. 이후로는 소리 없이 진행한다. */
  function sound(kana: KanaChar): boolean {
    if (onPlay(kana) !== 'unavailable') {
      return true;
    }
    setSoundBroken(true);
    setPicked(null);
    if (route.mode === 'read' && route.choices === 'sound') {
      setAnnouncement('이 기기에서는 소리를 낼 수 없어서 로마자 보기로 바꿨어요.');
    }
    return false;
  }

  function listen() {
    if (question && sound(question.answer)) {
      setHeard(true);
    }
  }

  function submit(id: string) {
    if (!question || chosen) {
      return;
    }
    const correct = id === question.answer.id;
    const { answer } = question;
    setChosen(id);
    setPicked(null);
    setResults((previous) => [...previous, { kana: answer, correct }]);
    onAnswer(answer, correct);
    setAnnouncement(
      correct
        ? `정답! ${answer.char}, ${answer.romaji}`
        : `아쉬워요. 정답은 ${answer.char}, ${answer.romaji}`,
    );
    // 문자를 보고 고른 뒤에는 정답 소리를 들려준다. 소리가 안 되는 기기면 조용히 넘어간다.
    if (route.mode === 'read' && !soundBroken) {
      sound(answer);
    }
  }

  function choose(kana: KanaChar) {
    if (chosen) {
      return;
    }
    if (style === 'sound') {
      if (sound(kana)) {
        setPicked(kana.id);
      }
      return;
    }
    submit(kana.id);
  }

  function next() {
    const nextIndex = index + 1;
    setIndex(nextIndex);
    setChosen(null);
    setPicked(null);
    setHeard(false);
    const upcoming = questions[nextIndex];
    if (!upcoming) {
      const score = results.filter((result) => result.correct).length;
      setAnnouncement(`${questions.length}문제 중 ${score}개 맞혔어요.`);
      return;
    }
    setAnnouncement('');
    // 듣고 고르기: 다음 문제 소리를 이 버튼 처리 안에서 바로 낸다.
    if (route.mode === 'listen' && !soundBroken && sound(upcoming.answer)) {
      setHeard(true);
    }
  }

  const live = (
    <p className="visually-hidden" aria-live="polite">
      {announcement}
    </p>
  );

  const title =
    route.mode === 'listen' ? '듣고 고르기' : style === 'sound' ? '보고 고르기(소리)' : '보고 고르기';

  return (
    <div className="app aiueo deck quiz">
      <header className="deck__bar">
        <button type="button" className="btn btn--ghost btn--small deck__back" onClick={onBack}>
          <span aria-hidden>←</span> {quiz?.label ?? '퀴즈'}
        </button>
        {question && !listenBlocked && (
          <span
            className="deck__progress"
            aria-label={`${questions.length}문제 중 ${index + 1}번째`}
          >
            {index + 1} / {questions.length}
          </span>
        )}
      </header>

      <main className="deck__main quiz__main">
        <h1 className={done ? 'quiz__result-title' : 'visually-hidden'}>
          {done ? '결과' : `${quiz?.label ?? ''} ${title}`}
        </h1>

        {!quiz && <QuizMessage text="없는 학습 범위예요." onBack={onBack} />}
        {quiz && questions.length === 0 && (
          <QuizMessage
            text={EMPTY_TEXT[route.range] ?? '이 범위에는 문자가 없어요.'}
            onBack={onBack}
          />
        )}

        {question && listenBlocked && (
          <div className="deck__message">
            <p>
              이 기기에서는 일본어 소리를 낼 수 없어서 듣고 고르기를 할 수 없어요. 문자를 보고 발음을
              고르는 퀴즈로 바꿔 풀 수 있어요.
            </p>
            <button type="button" className="btn btn--primary" onClick={onSwitchToRead}>
              보고 고르기로 바꾸기
            </button>
            <button type="button" className="btn btn--ghost" onClick={onBack}>
              돌아가기
            </button>
          </div>
        )}

        {question && !listenBlocked && (
          <>
            {route.mode === 'read' ? (
              <div className="quiz__prompt">
                <span className="quiz__kana" lang="ja">
                  {question.answer.char}
                </span>
                <span className="visually-hidden">이 문자의 발음은?</span>
              </div>
            ) : (
              <div className="quiz__prompt quiz__prompt--listen">
                <button
                  type="button"
                  className="btn btn--primary btn--large quiz__listen"
                  onClick={listen}
                >
                  <span aria-hidden>▶</span> {heard ? '다시 듣기' : '듣기'}
                </button>
              </div>
            )}

            <p className="deck__hint">
              {route.mode === 'listen'
                ? heard
                  ? '들은 소리의 글자를 골라요.'
                  : '먼저 ▶ 듣기를 눌러요.'
                : style === 'sound'
                  ? '보기를 눌러 들어 보고, 맞는 소리를 골라 "이걸로"를 눌러요.'
                  : '알맞은 발음을 골라요.'}
            </p>

            <ul className="quiz__choices" aria-label="보기">
              {question.choices.map((kana, position) => (
                <li key={kana.id}>
                  <ChoiceButton
                    kana={kana}
                    position={position}
                    look={route.mode === 'listen' ? 'kana' : style}
                    state={choiceState(kana, question, chosen, picked)}
                    revealed={chosen !== null}
                    disabled={chosen !== null || (route.mode === 'listen' && !heard)}
                    onClick={() => choose(kana)}
                  />
                </li>
              ))}
            </ul>

            {chosen ? (
              <div className="quiz__feedback">
                <p
                  className={`quiz__verdict quiz__verdict--${chosen === question.answer.id ? 'right' : 'wrong'}`}
                  aria-hidden
                >
                  {chosen === question.answer.id ? '⭕ 정답!' : '✕ 아쉬워요'}
                  <span className="quiz__answer">
                    <span lang="ja">{question.answer.char}</span> {question.answer.romaji} ·{' '}
                    {question.answer.hangul}
                  </span>
                </p>
                <button
                  type="button"
                  className="btn btn--primary btn--large quiz__next"
                  onClick={next}
                  // 답을 내면 보기가 잠기므로 다음 버튼으로 포커스를 옮긴다.
                  autoFocus
                >
                  {index + 1 < questions.length ? '다음 문제' : '결과 보기'}
                </button>
              </div>
            ) : (
              style === 'sound' &&
              route.mode === 'read' && (
                <button
                  type="button"
                  className="btn btn--primary btn--large quiz__next"
                  disabled={picked === null}
                  onClick={() => picked && submit(picked)}
                >
                  이걸로
                </button>
              )
            )}
          </>
        )}

        {done && (
          <QuizResult
            results={results}
            bookmarks={bookmarks}
            onToggleBookmark={onToggleBookmark}
            onRestart={onRestart}
            onBack={onBack}
          />
        )}

        {live}
      </main>
    </div>
  );
}

type ChoiceState = 'idle' | 'picked' | 'right' | 'wrong' | 'dim';

function choiceState(
  kana: KanaChar,
  question: Question,
  chosen: string | null,
  picked: string | null,
): ChoiceState {
  if (chosen === null) {
    return picked === kana.id ? 'picked' : 'idle';
  }
  if (kana.id === question.answer.id) {
    return 'right';
  }
  return kana.id === chosen ? 'wrong' : 'dim';
}

function ChoiceButton({
  kana,
  position,
  look,
  state,
  revealed,
  disabled,
  onClick,
}: {
  kana: KanaChar;
  position: number;
  look: 'romaji' | 'sound' | 'kana';
  state: ChoiceState;
  revealed: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const mark = state === 'right' ? '정답' : state === 'wrong' ? '고른 답, 오답' : undefined;
  let content;
  let label: string | undefined;
  if (look === 'kana') {
    content = (
      <span className="quiz__choice-kana" lang="ja">
        {kana.char}
      </span>
    );
  } else if (look === 'sound') {
    // 표기 없이 귀로 고른다. 답을 낸 뒤에만 로마자를 보여 준다.
    content = (
      <>
        <span aria-hidden>▶ {position + 1}</span>
        {revealed && <span className="quiz__choice-reveal">{kana.romaji}</span>}
      </>
    );
    label = `보기 ${position + 1} 듣기${revealed ? `, ${kana.romaji}` : ''}`;
  } else {
    content = <span className="quiz__choice-romaji">{kana.romaji}</span>;
  }
  if (mark) {
    label = `${label ?? (look === 'kana' ? kana.char : kana.romaji)}, ${mark}`;
  }
  return (
    <button
      type="button"
      className={`quiz__choice quiz__choice--${state}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={look === 'sound' && !revealed ? state === 'picked' : undefined}
    >
      {content}
    </button>
  );
}

function QuizResult({
  results,
  bookmarks,
  onToggleBookmark,
  onRestart,
  onBack,
}: {
  results: readonly Result[];
  bookmarks: ReadonlySet<string>;
  onToggleBookmark: (id: string) => void;
  onRestart: () => void;
  onBack: () => void;
}) {
  const score = results.filter((result) => result.correct).length;
  const wrong = [
    ...new Map(
      results.filter((result) => !result.correct).map((result) => [result.kana.id, result.kana]),
    ).values(),
  ];
  const unsaved = wrong.filter((kana) => !bookmarks.has(kana.id));

  return (
    <section className="quiz__result" aria-label="결과">
      <p className="quiz__score">
        <strong>{score}</strong> / {results.length} 맞혔어요
      </p>

      {wrong.length === 0 ? (
        <p className="quiz__perfect">모두 맞혔어요! 🎉</p>
      ) : (
        <>
          <h2 className="quiz__result-head">틀린 문자</h2>
          <p className="aiueo__lead">내 문자에 담아 두면 따로 모아 다시 익힐 수 있어요.</p>
          <ul className="quiz__wrong" aria-label="틀린 문자">
            {wrong.map((kana) => {
              const saved = bookmarks.has(kana.id);
              return (
                <li key={kana.id}>
                  <button
                    type="button"
                    className={`quiz__wrong-item${saved ? ' quiz__wrong-item--on' : ''}`}
                    onClick={() => onToggleBookmark(kana.id)}
                    aria-pressed={saved}
                    aria-label={`${kana.char} ${kana.romaji} 내 문자에 담기`}
                  >
                    <span className="quiz__wrong-kana" lang="ja" aria-hidden>
                      {kana.char}
                    </span>
                    <span className="quiz__wrong-romaji" aria-hidden>
                      {kana.romaji}
                    </span>
                    <span className="quiz__wrong-mark" aria-hidden>
                      {saved ? '★' : '☆'}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            className="btn"
            disabled={unsaved.length === 0}
            onClick={() => unsaved.forEach((kana) => onToggleBookmark(kana.id))}
          >
            {unsaved.length === 0 ? '★ 모두 담았어요' : '☆ 틀린 문자 모두 담기'}
          </button>
        </>
      )}

      <div className="quiz__result-actions">
        <button type="button" className="btn btn--primary btn--large" onClick={onRestart}>
          한 판 더
        </button>
        <button type="button" className="btn btn--large" onClick={onBack}>
          돌아가기
        </button>
      </div>
    </section>
  );
}

function QuizMessage({ text, onBack }: { text: string; onBack: () => void }) {
  return (
    <div className="deck__message">
      <p>{text}</p>
      <button type="button" className="btn btn--primary" onClick={onBack}>
        돌아가기
      </button>
    </div>
  );
}
