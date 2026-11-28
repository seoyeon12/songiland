import { confusablesOf } from '../../data/confusables';
import { getKana, HIRAGANA_SEION, type KanaChar } from '../../data/kana';
import type { MasteryMap } from '../../progress/mastery';
import { buildChoices, buildQuiz, CHOICE_COUNT, pickQuizKana, QUIZ_LENGTH } from './questions';

const kana = (key: string) => getKana(`hiragana-${key}`) as KanaChar;
const chars = (items: readonly KanaChar[]) => items.map((item) => item.char);
const TODAY = '2026-11-28';

describe('confusables', () => {
  it('pairs the look-alike characters from the design doc, both ways', () => {
    expect([...confusablesOf('hiragana-ha')].sort()).toEqual(['hiragana-ho', 'hiragana-ke']);
    expect([...confusablesOf('hiragana-re')].sort()).toEqual(['hiragana-ne', 'hiragana-wa']);
    expect(confusablesOf('hiragana-nu').has('hiragana-me')).toBe(true);
    expect([...confusablesOf('hiragana-chi')].sort()).toEqual(['hiragana-ki', 'hiragana-sa']);
    expect(confusablesOf('hiragana-ro').has('hiragana-ru')).toBe(true);
    expect(confusablesOf('hiragana-ri').has('hiragana-i')).toBe(true);
    expect(confusablesOf('hiragana-n').size).toBe(0);
  });

  it('only names characters that exist', () => {
    for (const item of HIRAGANA_SEION) {
      for (const id of confusablesOf(item.id)) {
        expect(getKana(id)).toBeDefined();
      }
    }
  });
});

describe('buildChoices', () => {
  it('gives four different choices including the answer, look-alikes first', () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      const choices = buildChoices(kana('ne'), seed);
      expect(choices).toHaveLength(CHOICE_COUNT);
      expect(new Set(choices.map((item) => item.id)).size).toBe(CHOICE_COUNT);
      expect(chars(choices)).toEqual(expect.arrayContaining(['ね', 'れ', 'わ']));
    }
  });

  it('fills up with other characters when there are few look-alikes', () => {
    const choices = buildChoices(kana('me'), 3);
    expect(chars(choices)).toEqual(expect.arrayContaining(['め', 'ぬ']));
    expect(choices).toHaveLength(CHOICE_COUNT);
  });

  it('never offers a second character with the same sound (お and を)', () => {
    for (let seed = 1; seed <= 200; seed += 1) {
      expect(chars(buildChoices(kana('o'), seed))).not.toContain('を');
      expect(chars(buildChoices(kana('wo'), seed))).not.toContain('お');
    }
  });

  it('never shows two choices with the same reading', () => {
    for (const answer of HIRAGANA_SEION) {
      for (let seed = 1; seed <= 30; seed += 1) {
        const readings = buildChoices(answer, seed).map((item) => item.romaji);
        expect(new Set(readings).size).toBe(CHOICE_COUNT);
      }
    }
  });

  it('is repeatable for the same seed and varies the answer position', () => {
    expect(buildChoices(kana('sa'), 42)).toEqual(buildChoices(kana('sa'), 42));
    const positions = new Set(
      Array.from({ length: 30 }, (_, seed) =>
        buildChoices(kana('sa'), seed + 1).findIndex((item) => item.char === 'さ'),
      ),
    );
    expect(positions.size).toBeGreaterThan(1);
  });
});

describe('buildQuiz', () => {
  const plan = (seed: number, mastery: MasteryMap = {}) => ({ seed, mastery, today: TODAY });

  it('asks every character once when the range fits in one round', () => {
    const row = HIRAGANA_SEION.filter((item) => item.row === 'ka');
    const quiz = buildQuiz(row, plan(7));
    expect(chars(quiz.map((question) => question.answer)).sort()).toEqual(
      ['か', 'き', 'く', 'け', 'こ'].sort(),
    );
    expect(buildQuiz(row, plan(7))).toEqual(quiz);
  });

  it('still gives four choices for a one-character range', () => {
    const [question] = buildQuiz([kana('n')], plan(1));
    expect(question?.choices).toHaveLength(CHOICE_COUNT);
  });

  it('caps a long range at ten, asking due characters first', () => {
    const due: MasteryMap = {
      'hiragana-ha': { box: 1, due: TODAY, recent: [0] },
      'hiragana-me': { box: 2, due: '2026-11-27', recent: [1] },
    };
    const notYet: MasteryMap = Object.fromEntries(
      HIRAGANA_SEION.filter((item) => !(item.id in due)).map((item) => [
        item.id,
        { box: 3, due: '2026-12-10', recent: [1] },
      ]),
    );
    for (let seed = 1; seed <= 10; seed += 1) {
      const picked = pickQuizKana(HIRAGANA_SEION, plan(seed, { ...notYet, ...due }));
      expect(picked).toHaveLength(QUIZ_LENGTH);
      expect(chars(picked)).toEqual(expect.arrayContaining(['は', 'め']));
    }
  });

  it('prefers characters never answered over ones not yet due', () => {
    const studied: MasteryMap = Object.fromEntries(
      HIRAGANA_SEION.slice(0, 40).map((item) => [item.id, { box: 4, due: '2026-12-10', recent: [1] }]),
    );
    const picked = pickQuizKana(HIRAGANA_SEION, plan(5, studied));
    const fresh = chars(HIRAGANA_SEION.slice(40));
    expect(chars(picked)).toEqual(expect.arrayContaining(fresh));
  });
});
