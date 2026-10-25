export type RandomInt = (upperExclusive: number) => number;

export type MainNumbers = [number, number, number, number, number, number];

/** 한 번 뽑은 결과. 본번호는 오름차순, 보너스는 본번호와 겹치지 않는다. */
export type LottoNumbers = {
  main: MainNumbers;
  bonus: number;
};
