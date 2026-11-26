import { HIRAGANA_SEION, HIRAGANA_SEION_ROWS, VOWELS, getKana } from './kana';

describe('hiragana seion data', () => {
  it('has the 46 basic hiragana in gojūon order', () => {
    expect(HIRAGANA_SEION.map((kana) => kana.char).join('')).toBe(
      'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん',
    );
  });

  it('uses unique, stable ids keyed by script and romaji', () => {
    const ids = HIRAGANA_SEION.map((kana) => kana.id);
    expect(new Set(ids).size).toBe(46);
    for (const id of ids) {
      expect(id).toMatch(/^hiragana-[a-z]+$/);
    }
    // を는 お와 로마자가 같아서 id 키만 wo로 구분한다.
    expect(getKana('hiragana-o')?.char).toBe('お');
    expect(getKana('hiragana-wo')).toMatchObject({ char: 'を', romaji: 'o' });
  });

  it('lays out 11 rows of 5 cells with the traditional gaps', () => {
    expect(HIRAGANA_SEION_ROWS).toHaveLength(11);
    const layout = HIRAGANA_SEION_ROWS.map((row) => {
      expect(row.cells).toHaveLength(VOWELS.length);
      return row.cells.map((cell) => cell?.char ?? '_').join('');
    });
    expect(layout).toEqual([
      'あいうえお',
      'かきくけこ',
      'さしすせそ',
      'たちつてと',
      'なにぬねの',
      'はひふへほ',
      'まみむめも',
      'や_ゆ_よ',
      'らりるれろ',
      'わ___を',
      'ん____',
    ]);
  });

  it('records each cell position and row', () => {
    for (const row of HIRAGANA_SEION_ROWS) {
      row.cells.forEach((cell, column) => {
        if (cell) {
          expect(cell).toMatchObject({ row: row.id, column, script: 'hiragana', unit: 'seion' });
        }
      });
    }
  });

  it('names rows for screen readers', () => {
    expect(HIRAGANA_SEION_ROWS.map((row) => row.label)).toEqual([
      'あ행', 'か행', 'さ행', 'た행', 'な행', 'は행', 'ま행', 'や행', 'ら행', 'わ행', 'ん',
    ]);
  });

  it('gives every character Hepburn romaji and a Hangul approximation', () => {
    for (const kana of HIRAGANA_SEION) {
      expect(kana.romaji).toMatch(/^[a-z]+$/);
      expect(kana.hangul).toMatch(/^[가-힣]+$/);
    }
    expect(['し', 'ち', 'つ', 'ふ'].map((char) => HIRAGANA_SEION.find((k) => k.char === char)?.romaji))
      .toEqual(['shi', 'chi', 'tsu', 'fu']);
  });

  it('notes the particle readings of は, へ and を', () => {
    expect(getKana('hiragana-ha')?.note).toMatch(/wa/);
    expect(getKana('hiragana-he')?.note).toMatch(/e\(에\)/);
    expect(getKana('hiragana-wo')?.note).toMatch(/을\/를/);
  });
});
