import { ARC_IDS, ARCS } from './data/arcs';
import { getBreed } from './data/breeds';
import { TRAITS } from './data/traits';
import { drawMeeting, MIN_MONTHS_TOGETHER } from './meeting';
import { createRng, type Rng } from './rng';
import { moodFor, stageFor } from './stages';
import { josa } from './text/josa';
import type { Arc, Dog, LogEntry, Meeting, RunState, Size, Stage, Stats, TraitId } from './types';

/** 기본 속도에서 한 달이 흐르는 시간(ms). 1년 ≈ 1분. 화면(3단계)이 쓴다. */
export const MS_PER_MONTH = 5000;

/** 안전장치: 이보다 길게 이어지는 판은 없다(40년). */
const MAX_MONTHS = 480;

const clamp = (value: number) => Math.min(100, Math.max(0, value));
const round2 = (value: number) => Math.round(value * 100) / 100;

/** 만남 카드만 미리 본다. 같은 시드로 startRun 하면 같은 만남이 나온다. */
export function previewMeeting(seed: number): Meeting {
  return drawMeeting(createRng(seed));
}

function drawArc(rng: Rng, meeting: Meeting): Arc {
  // 보호소·구조로 만난 아이는 "찡하다가 웃음" 흐름이 조금 더 자주 나온다.
  const rescued = meeting.route === 'shelter' || meeting.route === 'rescue';
  return rng.weighted(ARC_IDS, (arc) => (arc === 'tearsThenLaugh' && rescued ? 2 : 1));
}

/** 삼각 분포(두 균등 분포의 평균)로 수명을 뽑아 범위 가운데가 더 자주 나오게 한다. */
function drawLifespanMonths(rng: Rng, meeting: Meeting): number {
  const [min, max] = getBreed(meeting.breedId).lifespanYears;
  const years = min + ((rng.next() + rng.next()) / 2) * (max - min);
  return Math.max(Math.round(years * 12), meeting.ageMonths + MIN_MONTHS_TOGETHER);
}

function startingStats(rng: Rng, meeting: Meeting, stage: Stage): Stats {
  const stats: Stats = {
    health: 72 + rng.range(-5, 5),
    happiness: 55 + rng.range(-5, 5),
    bond: (meeting.ageMonths < 12 ? 35 : 20) + rng.range(-5, 5),
    sociability: 50 + rng.range(-8, 8),
  };
  if (meeting.route === 'rescue') {
    stats.health -= 10;
    stats.sociability -= 5;
  } else if (meeting.route === 'shelter') {
    stats.health -= 5;
  }
  if (stage === 'senior') {
    stats.health -= 10;
  } else if (stage === 'elderly') {
    stats.health -= 20;
  }
  for (const trait of meeting.traits) {
    const start = TRAITS[trait].start;
    stats.health += start.health ?? 0;
    stats.happiness += start.happiness ?? 0;
    stats.bond += start.bond ?? 0;
    stats.sociability += start.sociability ?? 0;
  }
  return {
    health: round2(clamp(stats.health)),
    happiness: round2(clamp(stats.happiness)),
    bond: round2(clamp(stats.bond)),
    sociability: round2(clamp(stats.sociability)),
  };
}

/** 새 판을 시작한다. 강아지 이름만 플레이어가 정한다. */
export function startRun({ seed, name }: { seed: number; name: string }): RunState {
  const rng = createRng(seed);
  const meeting = drawMeeting(rng);
  const arc = drawArc(rng, meeting);
  const breed = getBreed(meeting.breedId);
  const stage = stageFor(breed.size, meeting.ageMonths);
  const trimmed = name.trim() || meeting.suggestedNames[0];

  const dog: Dog = {
    id: 'dog-1',
    name: trimmed,
    breedId: meeting.breedId,
    nickname: meeting.nickname,
    coatId: meeting.coatId,
    look: meeting.look,
    sex: meeting.sex,
    traits: meeting.traits,
    route: meeting.route,
    ageMonths: meeting.ageMonths,
    metAgeMonths: meeting.ageMonths,
    joinedMonth: 0,
    lifespanMonths: drawLifespanMonths(rng, meeting),
    stats: startingStats(rng, meeting, stage),
    stage,
    passedMonth: null,
  };

  return {
    version: 1,
    seed,
    rngState: rng.state(),
    month: 0,
    arc,
    dogs: [dog],
    household: { ease: round2(60 + rng.range(-5, 5)) },
    log: [{ month: 0, dogId: dog.id, kind: 'meet', text: `${josa(trimmed, '과/와')} 가족이 됐어요.` }],
    timeline: [{ month: 0, stage, mood: moodFor(dog.stats.happiness) }],
    status: 'running',
  };
}

const STAGE_TEXT: Record<Exclude<Stage, 'puppy'>, (name: string) => string> = {
  young: (name) => `${josa(name, '이/가')} 장난기 가득한 청년이 됐어요.`,
  adult: (name) => `${josa(name, '이/가')} 의젓한 어른이 됐어요.`,
  senior: (name) =>
    `${josa(name, '은/는')} 이제 시니어예요. 주둥이에 하얀 털이 보이기 시작했어요.`,
  elderly: (name) => `${josa(name, '은/는')} 이제 노견이에요. 느릿느릿한 산책도 좋아요.`,
};

const PASSED_TEXT: Record<Arc, (name: string) => string> = {
  cheerful: (name) =>
    `${josa(name, '은/는')} 강아지별로 긴 소풍을 떠났어요. 함께해서 정말 즐거웠어!`,
  laughThenTears: (name) =>
    `${josa(name, '은/는')} 가장 좋아하던 담요 위에서 편안하게 잠들었어요. 고마웠어, 정말 많이.`,
  calmTouching: (name) =>
    `${josa(name, '은/는')} 조용한 오후, 햇살 아래에서 편안하게 잠들었어요.`,
  tearsThenLaugh: (name) =>
    `${josa(name, '은/는')} 행복한 기억을 가득 안고 무지개다리를 건넜어요. 우리를 만나 줘서 고마워.`,
};

const HEALTH_TARGET: Record<Stage, number> = {
  puppy: 78,
  young: 85,
  adult: 80,
  senior: 66,
  elderly: 48,
};

/** 사건이 없는 한 달 동안의 자연스러운 변화. 2단계에서 사건 효과가 그 위에 더해진다. */
function driftStats(rng: Rng, dog: Dog, ease: number, size: Size): Stats {
  const { stats, stage, traits } = dog;
  const has = (trait: TraitId) => traits.includes(trait);

  const healthTarget =
    HEALTH_TARGET[stage] -
    (size === 'large' && (stage === 'senior' || stage === 'elderly') ? 6 : 0) +
    (has('easygoing') ? 2 : 0);
  const health = stats.health + (healthTarget - stats.health) * 0.08 + rng.range(-1.5, 1.5);

  const happinessTarget =
    55 +
    (ease - 50) * 0.3 +
    (stats.bond - 50) * 0.15 +
    (stats.health < 40 ? -12 : 0) +
    (has('foodie') || has('easygoing') ? 5 : 0);
  const happiness =
    stats.happiness + (happinessTarget - stats.happiness) * 0.15 + rng.range(-2, 2);

  const bond = stats.bond + (stats.bond < 70 ? 1.2 : 0.3) + (has('clingy') ? 0.3 : 0);

  const sociabilityTarget =
    50 +
    (has('social') ? 15 : 0) -
    (has('timid') ? 12 : 0) -
    (has('homebody') ? 5 : 0) +
    (stage === 'puppy' ? 8 : 0) -
    (stage === 'elderly' ? 8 : 0);
  const sociability =
    stats.sociability + (sociabilityTarget - stats.sociability) * 0.05 + rng.range(-1, 1);

  return {
    health: round2(clamp(health)),
    happiness: round2(clamp(happiness)),
    bond: round2(clamp(bond)),
    sociability: round2(clamp(sociability)),
  };
}

/** 건강이 계속 나쁘면 수명이 조금씩 줄고, 노년에 건강하면 조금 는다. */
function adjustLifespan(dog: Dog): number {
  const breed = getBreed(dog.breedId);
  let lifespan = dog.lifespanMonths;
  if (dog.stats.health < 35) {
    lifespan -= 0.5;
  } else if (dog.stats.health > 75 && (dog.stage === 'senior' || dog.stage === 'elderly')) {
    lifespan += 0.25;
  }
  const min = Math.max(breed.lifespanYears[0] * 12 - 24, dog.metAgeMonths + MIN_MONTHS_TOGETHER);
  const max = breed.lifespanYears[1] * 12 + 18;
  return round2(Math.min(max, Math.max(min, lifespan)));
}

/** 한 달을 진행한다. 입력 상태는 바꾸지 않고 새 상태를 돌려준다. */
export function advanceMonth(state: RunState): RunState {
  if (state.status === 'ended') {
    return state;
  }
  const rng = createRng(state.rngState);
  const month = state.month + 1;
  const log: LogEntry[] = [...state.log];
  const ease = round2(
    clamp(state.household.ease + (60 - state.household.ease) * 0.05 + rng.range(-2, 2)),
  );

  const dogs = state.dogs.map((dog): Dog => {
    if (dog.passedMonth !== null) {
      return dog;
    }
    const breed = getBreed(dog.breedId);
    const ageMonths = dog.ageMonths + 1;
    const stage = stageFor(breed.size, ageMonths);
    let next: Dog = { ...dog, ageMonths, stage };
    next = { ...next, stats: driftStats(rng, next, ease, breed.size) };
    next = { ...next, lifespanMonths: adjustLifespan(next) };

    if (stage !== dog.stage && stage !== 'puppy') {
      log.push({ month, dogId: dog.id, kind: 'stage', text: STAGE_TEXT[stage](dog.name) });
    }
    const passing = ageMonths >= next.lifespanMonths;
    // 떠나는 달에는 생일 문장을 남기지 않는다(같은 달에 "생일 축하해"와 이별이 겹치지 않게).
    if (ageMonths % 12 === 0 && !passing) {
      log.push({
        month,
        dogId: dog.id,
        kind: 'birthday',
        text: `${josa(dog.name, '이/가')} ${ageMonths / 12}살이 됐어요. 생일 축하해!`,
      });
    }
    if (passing) {
      next = { ...next, passedMonth: month };
      log.push({ month, dogId: dog.id, kind: 'passed', text: PASSED_TEXT[state.arc](dog.name) });
    }
    return next;
  });

  const first = dogs[0];
  // 판은 첫째의 견생을 기준으로 끝난다(다견가정이어도 10~15분을 지키기 위해).
  const ended = first.passedMonth !== null;

  return {
    ...state,
    rngState: rng.state(),
    month,
    dogs,
    household: { ease },
    log,
    timeline: [...state.timeline, { month, stage: first.stage, mood: moodFor(first.stats.happiness) }],
    status: ended ? 'ended' : 'running',
  };
}

/** 끝까지 한 번에 진행한다(테스트·미리보기·자동 진행 마무리용). */
export function simulateToEnd(state: RunState): RunState {
  let current = state;
  while (current.status === 'running' && current.month < MAX_MONTHS) {
    current = advanceMonth(current);
  }
  return current;
}

export function arcTitle(arc: Arc): string {
  return ARCS[arc].title;
}
