import { getBreed, getCoat, type Dog, type Meeting } from '../engine';

type DogLike = Pick<Dog, 'breedId' | 'coatId' | 'nickname'> | Pick<Meeting, 'breedId' | 'coatId' | 'nickname'>;

/** "시고르자브종 (믹스견)"처럼 별칭이 있으면 별칭을 앞에 둔 견종 이름. */
export function breedLabel(dog: DogLike): string {
  const breed = getBreed(dog.breedId);
  return dog.nickname ? `${dog.nickname} (${breed.name})` : breed.name;
}

/** 일러스트의 화면 낭독기용 설명. */
export function portraitLabel(dog: DogLike, name?: string): string {
  const breed = getBreed(dog.breedId);
  const coat = getCoat(breed, dog.coatId);
  const who = name ? `${name}, ` : '';
  return `${who}${coat.label} ${dog.nickname ?? breed.name}`;
}
