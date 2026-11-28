import {
  addDays,
  applyAnswer,
  dayKey,
  isDue,
  isWeak,
  masteryLevel,
  recentErrorRate,
  type MasteryRecord,
} from './mastery';

// 기기 시간대의 달력 날짜로 계산하므로 지역 시각으로 만든다.
const NOV_28_NIGHT = new Date(2026, 10, 28, 23, 30);
const DEC_1 = new Date(2026, 11, 1, 9, 0);

function answers(record: MasteryRecord | undefined, results: boolean[], now: Date) {
  return results.reduce<MasteryRecord | undefined>(
    (current, correct) => applyAnswer(current, correct, now),
    record,
  ) as MasteryRecord;
}

describe('dates', () => {
  it('uses the local calendar day and rolls over months and years', () => {
    expect(dayKey(NOV_28_NIGHT)).toBe('2026-11-28');
    expect(addDays('2026-11-28', 3)).toBe('2026-12-01');
    expect(addDays('2026-12-25', 14)).toBe('2027-01-08');
    expect(addDays('2026-11-28', 0)).toBe('2026-11-28');
  });
});

describe('leitner boxes', () => {
  it('moves a first correct answer to box 2, due tomorrow', () => {
    expect(applyAnswer(undefined, true, NOV_28_NIGHT)).toEqual({
      box: 2,
      due: '2026-11-29',
      recent: [1],
    });
  });

  it('keeps a first wrong answer in box 1, due the same day', () => {
    expect(applyAnswer(undefined, false, NOV_28_NIGHT)).toEqual({
      box: 1,
      due: '2026-11-28',
      recent: [0],
    });
  });

  it('climbs one box per correct answer with 당일/1/3/7/14-day intervals, capped at 5', () => {
    const dues: Array<[number, string]> = [];
    let record: MasteryRecord | undefined = { box: 1, due: '2026-11-28', recent: [] };
    for (let step = 0; step < 5; step += 1) {
      record = applyAnswer(record, true, NOV_28_NIGHT);
      dues.push([record.box, record.due]);
    }
    expect(dues).toEqual([
      [2, '2026-11-29'],
      [3, '2026-12-01'],
      [4, '2026-12-05'],
      [5, '2026-12-12'],
      [5, '2026-12-12'],
    ]);
  });

  it('drops back to box 1 on any wrong answer', () => {
    const high = answers(undefined, [true, true, true, true], NOV_28_NIGHT);
    expect(high.box).toBe(5);
    expect(applyAnswer(high, false, DEC_1)).toMatchObject({ box: 1, due: '2026-12-01' });
  });

  it('keeps only the last 10 answers', () => {
    const record = answers(undefined, Array.from({ length: 12 }, (_, i) => i % 2 === 0), DEC_1);
    expect(record.recent).toHaveLength(10);
  });

  it('is due on and after its review day', () => {
    const record: MasteryRecord = { box: 3, due: '2026-12-01', recent: [1] };
    expect(isDue(record, '2026-11-30')).toBe(false);
    expect(isDue(record, '2026-12-01')).toBe(true);
    expect(isDue(record, '2026-12-09')).toBe(true);
  });
});

describe('weak characters', () => {
  it('looks at the error rate of the last five answers', () => {
    const record = (recent: Array<0 | 1>): MasteryRecord => ({ box: 1, due: '2026-11-28', recent });
    expect(recentErrorRate(record([]))).toBeNull();
    expect(isWeak(record([]))).toBe(false);
    expect(isWeak(record([0]))).toBe(true);
    expect(isWeak(record([1, 1, 0]))).toBe(true); // 1/3
    expect(isWeak(record([1, 1, 1, 1, 0]))).toBe(false); // 1/5
    // 오래전 오답은 창 밖으로 밀려나면 더는 약한 문자가 아니다.
    expect(isWeak(record([0, 0, 1, 1, 1, 1, 1]))).toBe(false);
  });

  it('reports level 0 for characters never answered', () => {
    expect(masteryLevel(undefined)).toBe(0);
    expect(masteryLevel({ box: 4, due: '2026-12-01', recent: [1] })).toBe(4);
  });
});
