import { useId, useState } from 'react';
import { QUIZ_LENGTH } from '../features/quiz/questions';
import type { ChoiceStyle, StudyMode } from '../progress/store';
import {
  bookmarkedKana,
  FIXED_RANGES,
  MINE_RANGE_ID,
  REVIEW_RANGE_ID,
  reviewKana,
  WEAK_RANGE_ID,
  weakKana,
  type StudyProgress,
  type StudyRange,
} from '../study/ranges';

export type StudyScreenProps = {
  bookmarks: ReadonlySet<string>;
  progress: StudyProgress;
  /** 마지막으로 고른 방식과 보기 표기(저장소 설정). */
  mode: StudyMode;
  choices: ChoiceStyle;
  /** 이 기기에서 일본어 소리를 낼 수 있는가. 아니면 소리 보기와 듣고 고르기를 끈다. */
  soundSupported: boolean;
  onModeChange: (mode: StudyMode) => void;
  onChoicesChange: (choices: ChoiceStyle) => void;
  /** 범위를 골랐다. 카드면 `shuffle`이 섞기 여부다. */
  onStart: (rangeId: string, mode: StudyMode, shuffle: boolean) => void;
};

const MODES: ReadonlyArray<{ mode: StudyMode; label: string; detail: string }> = [
  { mode: 'cards', label: '카드', detail: '넘기며 보기' },
  { mode: 'read', label: '보고 고르기', detail: '문자 → 발음' },
  { mode: 'listen', label: '듣고 고르기', detail: '소리 → 문자' },
];

const NO_SOUND = '이 기기에서는 일본어 소리를 낼 수 없어서 쓸 수 없어요.';

/**
 * 학습 탭(기획서 8장 "학습"): 위에서 방식을 고르고, 아래 범위를 누르면 바로 시작한다.
 * 방식과 보기 표기는 저장해 두어 퀴즈를 마치고 돌아와도 그대로다.
 */
export function StudyScreen({
  bookmarks,
  progress,
  mode: savedMode,
  choices: savedChoices,
  soundSupported,
  onModeChange,
  onChoicesChange,
  onStart,
}: StudyScreenProps) {
  const [shuffle, setShuffle] = useState(false);
  const shuffleId = useId();
  const modeName = useId();
  const choicesName = useId();

  // 소리를 낼 수 없는 기기에서는 저장된 설정이 소리 쪽이어도 쓸 수 있는 쪽으로 보여 준다.
  const mode: StudyMode = savedMode === 'listen' && !soundSupported ? 'read' : savedMode;
  const choices: ChoiceStyle = soundSupported ? savedChoices : 'romaji';
  const isQuiz = mode !== 'cards';

  const special: Array<{ id: string; label: string; icon: string; kana: number; empty: string }> =
    [
      {
        id: MINE_RANGE_ID,
        label: '내 문자',
        icon: '★',
        kana: bookmarkedKana(bookmarks).length,
        empty: '아직 없어요',
      },
      {
        id: REVIEW_RANGE_ID,
        label: '복습할 문자',
        icon: '↻',
        kana: reviewKana(progress).length,
        empty: '오늘은 없어요',
      },
      {
        id: WEAK_RANGE_ID,
        label: '약한 문자',
        icon: '!',
        kana: weakKana(progress).length,
        empty: '아직 없어요',
      },
    ];

  function detail(count: number): string {
    return isQuiz && count > QUIZ_LENGTH ? `${count}자 중 ${QUIZ_LENGTH}문제` : `${count}자`;
  }

  return (
    <>
      <header className="aiueo__screen-head">
        <h1 className="aiueo__screen-title">학습</h1>
        <p className="aiueo__lead">방식을 고르고, 익힐 글자 묶음을 눌러 시작해요.</p>
      </header>

      <fieldset className="study__group">
        <legend className="study__legend">방식</legend>
        <div className="segmented">
          {MODES.map((item) => {
            const disabled = item.mode === 'listen' && !soundSupported;
            return (
              <label
                key={item.mode}
                className={`segmented__option${disabled ? ' segmented__option--disabled' : ''}`}
              >
                <input
                  type="radio"
                  name={modeName}
                  value={item.mode}
                  checked={mode === item.mode}
                  disabled={disabled}
                  onChange={() => onModeChange(item.mode)}
                />
                <span className="segmented__label">{item.label}</span>
                <span className="segmented__detail">{item.detail}</span>
              </label>
            );
          })}
        </div>
        {!soundSupported && <p className="study__note">듣고 고르기: {NO_SOUND}</p>}
      </fieldset>

      {mode === 'cards' && (
        <label className="aiueo__switch" htmlFor={shuffleId}>
          <input
            id={shuffleId}
            type="checkbox"
            checked={shuffle}
            onChange={(event) => setShuffle(event.target.checked)}
          />
          <span>순서 섞기</span>
        </label>
      )}

      {mode === 'read' && (
        <fieldset className="study__group">
          <legend className="study__legend">보기</legend>
          <div className="segmented segmented--two">
            <label className="segmented__option">
              <input
                type="radio"
                name={choicesName}
                value="romaji"
                checked={choices === 'romaji'}
                onChange={() => onChoicesChange('romaji')}
              />
              <span className="segmented__label">로마자</span>
              <span className="segmented__detail">ka · ki · ku</span>
            </label>
            <label
              className={`segmented__option${soundSupported ? '' : ' segmented__option--disabled'}`}
            >
              <input
                type="radio"
                name={choicesName}
                value="sound"
                checked={choices === 'sound'}
                disabled={!soundSupported}
                onChange={() => onChoicesChange('sound')}
              />
              <span className="segmented__label">소리</span>
              <span className="segmented__detail">표기 없이 귀로</span>
            </label>
          </div>
          {!soundSupported && <p className="study__note">소리 보기: {NO_SOUND}</p>}
        </fieldset>
      )}

      {mode === 'listen' && (
        <p className="aiueo__lead">소리를 듣고 알맞은 글자를 골라요. 문제마다 ▶ 듣기를 눌러요.</p>
      )}

      <ul className="ranges" aria-label="학습 범위">
        {special.map((item) => (
          <li key={item.id}>
            <RangeButton
              label={item.label}
              detail={item.kana > 0 ? detail(item.kana) : item.empty}
              preview={item.icon}
              disabled={item.kana === 0}
              onClick={() => onStart(item.id, mode, shuffle)}
            />
          </li>
        ))}
        {FIXED_RANGES.map((range) => (
          <li key={range.id}>
            <RangeButton
              label={range.label}
              detail={detail(range.kana.length)}
              preview={previewOf(range)}
              previewLang="ja"
              onClick={() => onStart(range.id, mode, shuffle)}
            />
          </li>
        ))}
      </ul>
    </>
  );
}

function previewOf(range: StudyRange): string {
  return range.kana
    .slice(0, 5)
    .map((kana) => kana.char)
    .join('');
}

function RangeButton({
  label,
  detail,
  preview,
  previewLang,
  disabled = false,
  onClick,
}: {
  label: string;
  detail: string;
  preview: string;
  previewLang?: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" className="ranges__item" onClick={onClick} disabled={disabled}>
      <span className="ranges__preview" lang={previewLang} aria-hidden>
        {preview}
      </span>
      <span className="ranges__label">{label}</span>
      <span className="ranges__detail">{detail}</span>
    </button>
  );
}
