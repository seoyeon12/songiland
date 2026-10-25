import { convert, detectDirection, toHangul, toLatin } from './convert';

describe('toHangul', () => {
  it.each([
    ['dkssudgktpdy', '안녕하세요'],
    ['gksrmf', '한글'],
    ['rhk', '과'],
    ['dhksfy', '완료'],
    ['emfdjrkqslek', '들어갑니다'],
    ['rnjsfur', '권력'],
  ])('composes %s into %s', (keys, hangul) => {
    expect(toHangul(keys)).toBe(hangul);
  });

  it('builds compound finals and moves them to the next syllable before a vowel', () => {
    expect(toHangul('rkqt')).toBe('값');
    expect(toHangul('dlfrdj')).toBe('읽어');
    expect(toHangul('dkswdk')).toBe('앉아');
    expect(toHangul('qnpfr')).toBe('뷁');
  });

  it('uses Shift only for double consonants and ㅒ·ㅖ, and ignores Caps Lock elsewhere', () => {
    expect(toHangul('Tkd')).toBe('쌍');
    expect(toHangul('Rnf')).toBe('꿀');
    expect(toHangul('DKSSUD')).toBe('안녕');
  });

  it('keeps lone jamo and non-letter characters', () => {
    expect(toHangul('zzz')).toBe('ㅋㅋㅋ');
    expect(toHangul('bb')).toBe('ㅠㅠ');
    expect(toHangul('dkssud, 123!\n')).toBe('안녕, 123!\n');
  });
});

describe('toLatin', () => {
  it('splits syllables, compound vowels and compound finals into keys', () => {
    expect(toLatin('안녕하세요')).toBe('dkssudgktpdy');
    expect(toLatin('괜찮아')).toBe('rhoscksgdk');
    expect(toLatin('닭')).toBe('ekfr');
    expect(toLatin('ㅋㅋ ㅘ')).toBe('zz hk');
  });

  it('uses Shift keys for double consonants and ㅒ·ㅖ', () => {
    expect(toLatin('쌍꿀')).toBe('TkdRnf');
    expect(toLatin('얘예')).toBe('dOdP');
  });

  it.each(['안녕하세요', '값', '읽어', '뷁', '꿀벌', '쌍쌍바', '의자', '괜찮아', '삶'])(
    'round-trips %s through the keyboard',
    (word) => {
      expect(toHangul(toLatin(word))).toBe(word);
    },
  );
});

describe('detectDirection', () => {
  it('chooses Hangul → Latin when Hangul dominates, otherwise Latin → Hangul', () => {
    expect(detectDirection('dkssud')).toBe('toHangul');
    expect(detectDirection('안녕')).toBe('toLatin');
    expect(detectDirection('ㅋㅋㅋ')).toBe('toLatin');
    expect(detectDirection('')).toBe('toHangul');
  });

  it('feeds convert()', () => {
    expect(convert('gksrmf', 'toHangul')).toBe('한글');
    expect(convert('한글', 'toLatin')).toBe('gksrmf');
  });
});
