import { confusablesOf } from '../../data/confusables';
import { HIRAGANA_SEION, type KanaChar } from '../../data/kana';
import { isDue, type MasteryMap } from '../../progress/mastery';
import { shuffled } from '../../study/ranges';

/** 한 판 최대 문제 수. 범위가 이보다 작으면 범위 한 바퀴만 낸다. */
export const QUIZ_LENGTH = 10;

/** 보기 수(4지선다). */
export const CHOICE_COUNT = 4;

export type Question = {
  answer: KanaChar;
  /** 정답을 포함한 보기. 화면에 이 순서로 보여 준다. */
  choices: KanaChar[];
};

export type QuizPlan = {
  /** 섞기 시드. 주소에 들어가므로 같은 시드면 같은 문제·보기가 나온다. */
  seed: number;
  /** 읽기 숙련도. 범위가 길 때 무엇을 먼저 낼지 정한다. */
  mastery: MasteryMap;
  /** 오늘(`YYYY-MM-DD`). */
  today: string;
};

/** 시드 하나에서 문제마다 다른 시드를 만든다. */
function deriveSeed(seed: number, salt: number): number {
  return (Math.imul(seed, 1_000_003) + Math.imul(salt + 1, 7_919)) >>> 0;
}

/**
 * 범위에서 이번 판에 낼 문자를 고른다.
 * 범위가 `QUIZ_LENGTH` 이하면 모두 낸다. 넘치면 복습일이 된 문자 → 아직 풀어 보지 않은 문자 →
 * 나머지(낮은 상자부터) 순으로 골라, 고른 것끼리 다시 섞는다.
 */
export function pickQuizKana(kana: readonly KanaChar[], plan: QuizPlan): KanaChar[] {
  const order = shuffled(kana, plan.seed);
  if (order.length <= QUIZ_LENGTH) {
    return order;
  }
  const rank = (item: KanaChar): [number, number] => {
    const record = plan.mastery[item.id];
    if (!record) {
      return [1, 0];
    }
    return [isDue(record, plan.today) ? 0 : 2, record.box];
  };
  const ranked = order
    .map((item, index) => ({ item, index, rank: rank(item) }))
    .sort((a, b) => a.rank[0] - b.rank[0] || a.rank[1] - b.rank[1] || a.index - b.index)
    .slice(0, QUIZ_LENGTH)
    .map(({ item }) => item);
  return shuffled(ranked, deriveSeed(plan.seed, -1));
}

/**
 * 정답 하나에 보기 4개를 만든다. 오답은 헷갈리는 문자에서 먼저 뽑고, 모자라면 나머지에서 뽑는다.
 * 소리가 같은 문자(お와 を)는 한 문제에 하나만 둔다. 정답과 같으면 둘 다 정답이 되고, 오답끼리
 * 같으면 로마자 보기가 똑같이 두 번 보인다.
 * 오답은 범위와 상관없이 청음 전체(`pool`)에서 고른다. 범위가 한 글자여도 4지선다가 된다.
 */
export function buildChoices(
  answer: KanaChar,
  seed: number,
  pool: readonly KanaChar[] = HIRAGANA_SEION,
): KanaChar[] {
  const near = confusablesOf(answer.id);
  const eligible = pool.filter((kana) => kana.id !== answer.id && kana.romaji !== answer.romaji);
  const candidates = [
    ...shuffled(
      eligible.filter((kana) => near.has(kana.id)),
      deriveSeed(seed, 1),
    ),
    ...shuffled(
      eligible.filter((kana) => !near.has(kana.id)),
      deriveSeed(seed, 2),
    ),
  ];
  const sounds = new Set([answer.romaji]);
  const distractors: KanaChar[] = [];
  for (const kana of candidates) {
    if (distractors.length === CHOICE_COUNT - 1) {
      break;
    }
    if (!sounds.has(kana.romaji)) {
      sounds.add(kana.romaji);
      distractors.push(kana);
    }
  }
  return shuffled([answer, ...distractors], deriveSeed(seed, 3));
}

/** 이번 판 문제 목록. 퀴즈를 시작할 때 한 번 만들고 끝날 때까지 고정한다. */
export function buildQuiz(kana: readonly KanaChar[], plan: QuizPlan): Question[] {
  return pickQuizKana(kana, plan).map((answer, index) => ({
    answer,
    choices: buildChoices(answer, deriveSeed(plan.seed, index + 10)),
  }));
}
