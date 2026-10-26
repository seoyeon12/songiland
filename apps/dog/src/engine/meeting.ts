import { BREEDS, getBreed, getCoat, JINDO_COATS } from './data/breeds';
import { NAME_POOL, SONGI_EASTER_EGG_CHANCE } from './data/names';
import { TRAIT_IDS, traitsConflict } from './data/traits';
import type { Rng } from './rng';
import { stageStart } from './stages';
import { josa } from './text/josa';
import type { Breed, Meeting, Route, TraitId } from './types';

/** 견종 계열별 만남 경로 가중치. 시골 마당은 믹스견·진돗개에만 있다. 펫숍은 없다. */
const ROUTE_WEIGHTS: Record<Breed['family'], Record<Route, number>> = {
  mix: { shelter: 35, rural: 35, rescue: 20, acquaintance: 10 },
  jindo: { shelter: 35, rural: 25, rescue: 15, acquaintance: 25 },
  purebred: { shelter: 30, rural: 0, rescue: 10, acquaintance: 60 },
};

const ROUTES: readonly Route[] = ['shelter', 'rural', 'rescue', 'acquaintance'];

const JINDO_COAT_IDS = new Set(JINDO_COATS.map((coat) => coat.id));

/** 강아지가 우리와 최소한 함께 지내는 기간(개월). 노견 입양도 짧게나마 이야기가 있게 한다. */
export const MIN_MONTHS_TOGETHER = 24;

/** 시니어 입양: 시니어 시작 나이부터, 함께할 시간이 남도록 최소 수명보다 넉넉히 앞에서. */
function drawSeniorAgeMonths(rng: Rng, breed: Breed): number {
  const from = stageStart(breed.size, 'senior');
  const to = Math.max(
    from,
    Math.min(from + 36, breed.lifespanYears[0] * 12 - MIN_MONTHS_TOGETHER - 6),
  );
  return rng.intRange(from, to);
}

function drawAgeMonths(rng: Rng, breed: Breed, route: Route): number {
  switch (route) {
    case 'rural':
    case 'acquaintance':
      return rng.intRange(2, 4);
    case 'rescue':
      return rng.chance(0.4) ? rng.intRange(2, 6) : rng.intRange(12, 60);
    case 'shelter': {
      const roll = rng.next();
      if (roll < 0.5) {
        return rng.intRange(3, 6);
      }
      if (roll < 0.85) {
        return rng.intRange(12, 72);
      }
      return drawSeniorAgeMonths(rng, breed);
    }
  }
}

function drawTraits(rng: Rng): readonly [TraitId, TraitId] {
  const first = rng.pick(TRAIT_IDS);
  const rest = TRAIT_IDS.filter((id) => id !== first && !traitsConflict(first, id));
  return [first, rng.pick(rest)];
}

/** 밈 견종 별칭. 수치는 바탕 견종을 따르고 이름과 소개로만 개성을 준다. */
export function nicknameFor(breed: Breed, coatId: string, route: Route): string | null {
  if (breed.id === 'golden-retriever') {
    return '골댕이';
  }
  if (breed.family === 'mix' && route === 'rural') {
    return '시고르자브종';
  }
  if (breed.id === 'mix-medium' && JINDO_COAT_IDS.has(coatId)) {
    return '진도믹스';
  }
  return null;
}

const NICKNAME_INTROS: Record<string, string> = {
  시고르자브종: '혈통서는 없지만 마당 서열은 1위. 유서 깊은 시고르자브종이에요.',
  진도믹스: '눈빛은 진돗개, 애교는 반반. 진도믹스예요.',
  골댕이: '세상 모든 사람을 친구라고 믿는 골댕이예요.',
};

function routeIntro(route: Route, ageMonths: number, breed: Breed): string {
  const isPuppy = ageMonths < 12;
  const isSenior = ageMonths >= stageStart(breed.size, 'senior');
  switch (route) {
    case 'shelter':
      if (isPuppy) {
        return '보호소에서 새 가족을 기다리던 아기를 만났어요.';
      }
      return isSenior
        ? '보호소에서 나이 지긋한 강아지와 눈이 마주쳤어요.'
        : '보호소에서 한참을 기다린 어른 강아지를 만났어요.';
    case 'rural':
      return '시골 할머니 댁 마당에서 태어난 새끼 중 한 마리를 데려왔어요.';
    case 'rescue':
      return isPuppy
        ? '산책길에서 혼자 있던 아기를 만났어요. 주인을 찾아봤지만 소식이 없어 가족이 되기로 했어요.'
        : '공원에서 혼자 헤매던 강아지를 만났어요. 주인을 찾아봤지만 소식이 없어 가족이 되기로 했어요.';
    case 'acquaintance':
      return '아는 분 댁에서 태어난 아기를 분양받았어요.';
  }
}

function suggestNames(rng: Rng, breed: Breed, taken: readonly string[]): string[] {
  const pool = NAME_POOL.filter((name) => !taken.includes(name));
  const names: string[] = [];
  if (breed.id === 'bichon' && rng.chance(SONGI_EASTER_EGG_CHANCE) && !taken.includes('송이')) {
    names.push('송이');
  }
  while (names.length < 4) {
    const index = rng.int(pool.length);
    names.push(pool.splice(index, 1)[0]);
  }
  return names;
}

/** 새 식구를 들일 때 정해 둔 것. 정하지 않은 것은 첫 만남과 같은 규칙으로 뽑는다. */
export type MeetingWish = {
  route?: Route;
  /** 보호소의 나이 지긋한 아이(시니어) */
  senior?: boolean;
  /** 이미 가족인 아이들 이름. 추천 이름에서 뺀다. */
  takenNames?: readonly string[];
};

/**
 * 만남 뽑기. 같은 난수 흐름이면 언제나 같은 만남이 나온다.
 * 견종 → 경로 → 나이 → 털색·생김새 → 성별 → 성격 → 추천 이름 순서로 뽑는다.
 * 경로를 정해 두면 그 경로로 만날 수 있는 견종 안에서 뽑는다.
 */
export function drawMeeting(rng: Rng, wish: MeetingWish = {}): Meeting {
  const wishedRoute = wish.route;
  const breed = wishedRoute
    ? rng.weighted(BREEDS, (entry) =>
        ROUTE_WEIGHTS[entry.family][wishedRoute] > 0 ? entry.weight : 0,
      )
    : rng.weighted(BREEDS, (entry) => entry.weight);
  const routeWeights = ROUTE_WEIGHTS[breed.family];
  const route = wishedRoute ?? rng.weighted(ROUTES, (entry) => routeWeights[entry]);
  const ageMonths = wish.senior
    ? drawSeniorAgeMonths(rng, breed)
    : drawAgeMonths(rng, breed, route);
  const coat = rng.pick(breed.coats);
  const look = {
    ears: rng.pick(breed.ears),
    coatType: rng.pick(breed.coatTypes),
    tail: rng.pick(breed.tails),
    legs: breed.legs,
  };
  const sex = rng.chance(0.5) ? 'female' : 'male';
  const traits = drawTraits(rng);
  const nickname = nicknameFor(breed, coat.id, route);

  const intro = [routeIntro(route, ageMonths, breed)];
  intro.push(nickname ? NICKNAME_INTROS[nickname] : breed.intro);
  if (JINDO_COAT_IDS.has(coat.id)) {
    intro.push(`누가 봐도 ${josa(getCoat(breed, coat.id).label, '이에요/예요')}.`);
  }

  return {
    breedId: breed.id,
    nickname,
    coatId: coat.id,
    look,
    sex,
    ageMonths,
    route,
    traits,
    intro,
    suggestedNames: suggestNames(rng, getBreed(breed.id), wish.takenNames ?? []),
  };
}

export const ROUTE_LABELS: Record<Route, string> = {
  shelter: '보호소 입양',
  rural: '시골 마당',
  rescue: '길에서 구조',
  acquaintance: '지인 분양',
};
