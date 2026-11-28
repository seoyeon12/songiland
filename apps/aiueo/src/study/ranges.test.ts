import { bookmarkedKana, FIXED_RANGES, MINE_RANGE_ID, resolveRange, shuffled } from './ranges';

const chars = (range: { kana: readonly { char: string }[] } | null) =>
  range?.kana.map((kana) => kana.char).join('');

describe('study ranges', () => {
  it('offers all 46 seion and one range per row, with ん joined to わ행', () => {
    expect(FIXED_RANGES.map((range) => range.label)).toEqual([
      '히라가나 청음 전체',
      'あ행', 'か행', 'さ행', 'た행', 'な행', 'は행', 'ま행', 'や행', 'ら행', 'わ행·ん',
    ]);
    expect(FIXED_RANGES[0]?.kana).toHaveLength(46);
    expect(chars(resolveRange('row-wa', new Set()))).toBe('わをん');
    expect(chars(resolveRange('row-ya', new Set()))).toBe('やゆよ');
  });

  it('builds 내 문자 from bookmarks in gojūon order, skipping unknown ids', () => {
    const bookmarks = new Set(['hiragana-n', 'katakana-a', 'hiragana-ka', 'hiragana-a']);
    expect(bookmarkedKana(bookmarks).map((kana) => kana.char)).toEqual(['あ', 'か', 'ん']);
    expect(resolveRange(MINE_RANGE_ID, bookmarks)).toMatchObject({ label: '내 문자' });
  });

  it('returns null for an unknown range', () => {
    expect(resolveRange('row-zz', new Set())).toBeNull();
  });
});

describe('shuffled', () => {
  const items = Array.from({ length: 46 }, (_, index) => index);

  it('is a repeatable permutation for the same seed', () => {
    const once = shuffled(items, 42);
    expect(shuffled(items, 42)).toEqual(once);
    expect([...once].sort((a, b) => a - b)).toEqual(items);
    expect(once).not.toEqual(items);
  });

  it('gives different orders for different seeds and leaves the input alone', () => {
    expect(shuffled(items, 1)).not.toEqual(shuffled(items, 2));
    expect(items[0]).toBe(0);
  });
});
