import { ARC_IDS, ARCS } from './data/arcs';
import { getBreed } from './data/breeds';
import { TRAITS } from './data/traits';
import { EVENTS } from './events/catalog';
import { getEvent, isAvailable, outcomeWeight, pickByTone } from './events/picker';
import { render } from './events/template';
import type { Choice, Effects, EventCard } from './events/types';
import { closestRapport, findPair, isAlive, livingDogs, rapportBetween } from './family';
import { drawMeeting, MIN_MONTHS_TOGETHER } from './meeting';
import { createRng, type Rng } from './rng';
import { moodFor, stageFor } from './stages';
import { josa } from './text/josa';
import type {
  Arc,
  Dog,
  Epilogue,
  Meeting,
  PendingChoice,
  Route,
  RunState,
  Size,
  Stage,
  Stats,
  StatKey,
  TraitId,
  Tone,
} from './types';

/** 기본 속도에서 한 달이 흐르는 시간(ms). 1년 ≈ 1분. 화면(3단계)이 쓴다. */
export const MS_PER_MONTH = 5000;

/** 안전장치: 이보다 길게 이어지는 판은 없다(40년). */
const MAX_MONTHS = 480;

/** 일상 사건이 일어날 확률(달마다). */
const DAILY_CHANCE = 0.35;
/**
 * 선택 사건 사이 최소 간격(개월)과, 간격이 지난 뒤 달마다 일어날 확률. 함께 사는 아이가 늘면
 * 고를 사건도 늘어나므로 간격을 한 아이당 3개월씩 넓혀 선택 카드가 너무 잦아지지 않게 한다.
 */
const CHOICE_GAP = 6;
const CHOICE_GAP_PER_DOG = 3;
const CHOICE_CHANCE = 0.3;

/** 일정으로만 오는 사건: 새 식구와의 첫 대면, 먼저 떠난 아이를 그리워하는 남은 아이. */
const FIRST_MEETING = 'first-meeting';
const MISSING_FRIEND = 'missing-friend';

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

function createDog(rng: Rng, meeting: Meeting, id: string, name: string, month: number): Dog {
  const breed = getBreed(meeting.breedId);
  const stage = stageFor(breed.size, meeting.ageMonths);
  return {
    id,
    name,
    breedId: meeting.breedId,
    nickname: meeting.nickname,
    coatId: meeting.coatId,
    look: meeting.look,
    sex: meeting.sex,
    traits: meeting.traits,
    route: meeting.route,
    ageMonths: meeting.ageMonths,
    metAgeMonths: meeting.ageMonths,
    joinedMonth: month,
    lifespanMonths: drawLifespanMonths(rng, meeting),
    stats: startingStats(rng, meeting, stage),
    stage,
    passedMonth: null,
    // 나이 지긋해서 가족이 된 아이에게만 열리는 사건이 있다.
    flags: stage === 'senior' || stage === 'elderly' ? ['senior-adopted'] : [],
    seen: {},
  };
}

/** 새 판을 시작한다. 강아지 이름만 플레이어가 정한다. */
export function startRun({ seed, name }: { seed: number; name: string }): RunState {
  const rng = createRng(seed);
  const meeting = drawMeeting(rng);
  const arc = drawArc(rng, meeting);
  const trimmed = name.trim() || meeting.suggestedNames[0];
  const dog = createDog(rng, meeting, 'dog-1', trimmed, 0);
  const ease = round2(60 + rng.range(-5, 5));

  return {
    version: 2,
    seed,
    rngState: rng.state(),
    month: 0,
    arc,
    dogs: [dog],
    pairs: [],
    household: { ease, flags: [] },
    log: [
      { month: 0, dogId: dog.id, kind: 'meet', text: `${josa(trimmed, '과/와')} 가족이 됐어요.` },
    ],
    timeline: [{ month: 0, stage: dog.stage, mood: moodFor(dog.stats.happiness) }],
    status: 'running',
    pendingChoice: null,
    pendingMeeting: null,
    scheduled: [],
    lastChoiceMonth: 0,
    epilogue: null,
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

/**
 * 사건이 없는 한 달 동안의 자연스러운 변화. 사건 효과는 그 위에 더해진다.
 * companion은 함께 사는 아이 중 가장 가까운 사이(혼자면 null). 사이가 좋으면 조금 더 행복하다.
 */
function driftStats(
  rng: Rng,
  dog: Dog,
  ease: number,
  size: Size,
  companion: number | null,
): Stats {
  const { stats, stage, traits } = dog;
  const has = (trait: TraitId) => traits.includes(trait);

  const healthTarget =
    HEALTH_TARGET[stage] -
    (size === 'large' && (stage === 'senior' || stage === 'elderly') ? 6 : 0) -
    (dog.flags.includes('terminal-illness') ? 25 : 0) +
    (has('easygoing') ? 2 : 0);
  const health = stats.health + (healthTarget - stats.health) * 0.08 + rng.range(-1.5, 1.5);

  const happinessTarget =
    50 +
    (ease - 50) * 0.3 +
    (stats.bond - 50) * 0.15 +
    (stats.health < 40 ? -12 : 0) -
    (stage === 'elderly' ? 4 : 0) +
    (has('foodie') || has('easygoing') ? 5 : 0) +
    (companion === null ? 0 : (companion - 50) * 0.08);
  // 천천히 돌아가게 해서 사건의 기쁨·서운함이 몇 달 동안 견생 지도에 남게 한다.
  const happiness =
    stats.happiness + (happinessTarget - stats.happiness) * 0.1 + rng.range(-2.5, 2.5);

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

function lifespanBounds(dog: Dog): [number, number] {
  const breed = getBreed(dog.breedId);
  const min = Math.max(breed.lifespanYears[0] * 12 - 24, dog.metAgeMonths + MIN_MONTHS_TOGETHER);
  const max = breed.lifespanYears[1] * 12 + 18;
  return [min, max];
}

/** 건강이 계속 나쁘면 수명이 조금씩 줄고, 노년에 건강하면 조금 는다. */
function adjustLifespan(dog: Dog): number {
  let lifespan = dog.lifespanMonths;
  if (dog.stats.health < 35) {
    lifespan -= 0.5;
  } else if (dog.stats.health > 75 && (dog.stage === 'senior' || dog.stage === 'elderly')) {
    lifespan += 0.25;
  }
  const [min, max] = lifespanBounds(dog);
  return round2(Math.min(max, Math.max(min, lifespan)));
}

/** 같은 달 안에서 고쳐 쓰는 작업용 사본. 입력 상태는 건드리지 않는다. */
function workingCopy(state: RunState): RunState {
  return {
    ...state,
    dogs: state.dogs.map((dog) => ({
      ...dog,
      stats: { ...dog.stats },
      flags: [...dog.flags],
      seen: { ...dog.seen },
    })),
    household: { ...state.household, flags: [...state.household.flags] },
    pairs: state.pairs.map((pair) => ({ ...pair })),
    log: [...state.log],
    timeline: [...state.timeline],
    scheduled: [...state.scheduled],
  };
}

const STAT_KEYS: readonly StatKey[] = ['health', 'happiness', 'bond', 'sociability'];

function applyEffects(
  rng: Rng,
  work: RunState,
  dog: Dog,
  effects: Effects | undefined,
  partner?: Dog,
): void {
  if (!effects) {
    return;
  }
  const targets = effects.shared && partner ? [dog, partner] : [dog];
  for (const key of STAT_KEYS) {
    const delta = effects[key];
    if (delta) {
      for (const target of targets) {
        target.stats[key] = round2(clamp(target.stats[key] + delta));
      }
    }
  }
  if (effects.rapport && partner) {
    const pair = findPair(work, dog.id, partner.id);
    if (pair) {
      pair.rapport = round2(clamp(pair.rapport + effects.rapport));
    }
  }
  if (effects.ease) {
    work.household.ease = round2(clamp(work.household.ease + effects.ease));
  }
  if (effects.lifespan) {
    const [min, max] = lifespanBounds(dog);
    dog.lifespanMonths = round2(Math.min(max, Math.max(min, dog.lifespanMonths + effects.lifespan)));
  }
  for (const flag of effects.flags ?? []) {
    if (!dog.flags.includes(flag)) {
      dog.flags.push(flag);
    }
  }
  for (const flag of effects.householdFlags ?? []) {
    if (!work.household.flags.includes(flag)) {
      work.household.flags.push(flag);
    }
  }
  if (effects.terminal) {
    if (!dog.flags.includes('terminal-illness')) {
      dog.flags.push('terminal-illness');
    }
    const [from, to] = effects.terminal;
    dog.lifespanMonths = Math.min(dog.lifespanMonths, dog.ageMonths + rng.intRange(from, to));
  }
  if (effects.pass) {
    dog.passedMonth = work.month;
  }
}

function fireEvent(
  rng: Rng,
  work: RunState,
  event: EventCard,
  dog: Dog,
  tone: Tone,
  partner?: Dog,
): void {
  const mate = event.pair ? partner : undefined;
  dog.seen[event.id] = work.month;
  if (mate) {
    mate.seen[event.id] = work.month;
  }
  const text = render(rng.pick(event.text), dog.name, mate?.name);
  if (event.choices) {
    const pending: PendingChoice = {
      eventId: event.id,
      dogId: dog.id,
      ...(mate && { partnerId: mate.id }),
      month: work.month,
      tone,
      text,
      choices: event.choices.map((choice) => ({
        id: choice.id,
        label: render(choice.label, dog.name, mate?.name),
      })),
      alwaysAsk: event.alwaysAsk ?? false,
    };
    work.pendingChoice = pending;
    work.lastChoiceMonth = work.month;
    return;
  }
  applyEffects(rng, work, dog, event.effects, mate);
  work.log.push({
    month: work.month,
    dogId: dog.id,
    ...(mate && { partnerId: mate.id }),
    kind: 'event',
    text,
    eventId: event.id,
    tone,
    memorable: event.memorable,
  });
}

/** 먼저 떠난 아이를 남은 아이들이 그리워하는 사건을 다음 달부터 하나씩 둔다. */
function scheduleMissing(work: RunState, passed: Dog): void {
  livingDogs(work).forEach((dog, index) => {
    work.scheduled.push({
      eventId: MISSING_FRIEND,
      dogId: dog.id,
      partnerId: passed.id,
      month: work.month + 1 + index,
    });
  });
}

/**
 * 한 달에 사건은 많아야 하나. 이어지는 사건 → 급한 사건 → 선택 사건 → 일상 사건 순서로 본다.
 * 급한 사건(첫날밤·예방접종·불치병 등)은 집에 있는 아이마다 따로 확인한다. 나머지는 이번 달
 * 주인공 한 아이(첫째가 조금 더 자주)와, 다른 아이가 있으면 짝 하나를 정해 고른다.
 */
function eventPhase(rng: Rng, work: RunState): void {
  const alive = livingDogs(work);
  if (alive.length === 0) {
    return;
  }

  const dueIndex = work.scheduled.findIndex((entry) => entry.month <= work.month);
  if (dueIndex >= 0) {
    const [due] = work.scheduled.splice(dueIndex, 1);
    const dog = alive.find((entry) => entry.id === due.dogId);
    const partner = work.dogs.find((entry) => entry.id === due.partnerId);
    const event = getEvent(due.eventId);
    if (dog && isAvailable(event, dog, work, partner)) {
      fireEvent(rng, work, event, dog, event.tones[0], partner);
      return;
    }
  }

  for (const dog of alive) {
    for (const event of EVENTS) {
      if (event.urgent && isAvailable(event, dog, work) && rng.chance(event.urgent.chance)) {
        fireEvent(rng, work, event, dog, event.tones[0]);
        return;
      }
    }
  }

  const first = work.dogs[0];
  const dog = rng.weighted(alive, (entry) => (entry.id === first.id ? 2 : 1));
  const others = alive.filter((entry) => entry.id !== dog.id);
  const partner = others.length > 0 ? rng.pick(others) : undefined;

  const gap = CHOICE_GAP + CHOICE_GAP_PER_DOG * (alive.length - 1);
  if (work.month - work.lastChoiceMonth >= gap && rng.chance(CHOICE_CHANCE)) {
    const candidates = EVENTS.filter(
      (event) => event.choices && !event.urgent && isAvailable(event, dog, work, partner),
    );
    const picked = pickByTone(rng, candidates, dog, work.arc);
    if (picked) {
      fireEvent(rng, work, picked.event, dog, picked.tone, partner);
      return;
    }
  }

  if (rng.chance(DAILY_CHANCE)) {
    const candidates = EVENTS.filter(
      (event) => !event.choices && !event.urgent && isAvailable(event, dog, work, partner),
    );
    const picked = pickByTone(rng, candidates, dog, work.arc);
    if (picked) {
      fireEvent(rng, work, picked.event, dog, picked.tone, partner);
    }
  }
}

/** 사이가 돌아가는 기준을 바꾸는 성격. 고집쟁이·껌딱지는 조금 덜, 느긋함·인싸는 조금 더 가깝다. */
const RAPPORT_TRAITS: Partial<Record<TraitId, number>> = {
  stubborn: -5,
  clingy: -3,
  easygoing: 4,
  social: 3,
};

/** 함께 지낸 시간만큼 사이도 천천히 가까워진다. 둘 다 사교적일수록 더 가까워진다. */
function driftRapport(rng: Rng, work: RunState): void {
  for (const pair of work.pairs) {
    const [a, b] = pair.dogIds.map((id) => work.dogs.find((dog) => dog.id === id)!);
    if (!isAlive(a) || !isAlive(b)) {
      continue;
    }
    const traits = [...a.traits, ...b.traits].reduce(
      (sum, trait) => sum + (RAPPORT_TRAITS[trait] ?? 0),
      0,
    );
    const target = 60 + ((a.stats.sociability + b.stats.sociability) / 2 - 50) * 0.5 + traits;
    pair.rapport = round2(
      clamp(pair.rapport + (target - pair.rapport) * 0.04 + rng.range(-1, 1)),
    );
  }
}

/** 첫 만남의 사이. 둘이 사교적일수록, 새 식구가 아기일수록 가깝게 시작한다. */
function firstRapport(rng: Rng, resident: Dog, newcomer: Dog): number {
  const sociability = (resident.stats.sociability + newcomer.stats.sociability) / 2;
  const puppy = newcomer.stage === 'puppy' ? 6 : 0;
  return round2(clamp(38 + (sociability - 50) * 0.4 + puppy + rng.range(-6, 6)));
}

/**
 * 첫째가 떠난 뒤 남은 아이들의 견생을 빠르게 이어 본다. 선택은 자동 결정으로 고른다.
 * 판이 끝난 상태라 새 식구 사건은 나오지 않는다. 결말 카드의 "남은 아이들의 이야기"가 된다.
 */
function writeEpilogue(rng: Rng, ended: RunState): Epilogue | null {
  const remaining = livingDogs(ended).map((dog) => dog.id);
  if (remaining.length === 0) {
    return null;
  }
  const work = workingCopy(ended);
  const from = work.log.length;
  const limit = work.month + MAX_MONTHS;
  while (work.dogs.some(isAlive) && work.month < limit) {
    if (work.pendingChoice) {
      applyChoice(rng, work, pickAuto(rng, work.pendingChoice));
    } else {
      stepMonth(rng, work, { epilogue: true });
    }
  }
  return {
    dogs: work.dogs.filter((dog) => remaining.includes(dog.id)),
    log: work.log.slice(from),
  };
}

function finishMonth(rng: Rng, work: RunState): RunState {
  // 판은 첫째의 견생을 기준으로 끝난다(다견가정이어도 10~15분을 지키기 위해).
  if (isAlive(work.dogs[0])) {
    return { ...work, rngState: rng.state(), status: 'running' };
  }
  const ended: RunState = { ...work, status: 'ended' };
  const epilogue = writeEpilogue(rng, ended);
  return { ...ended, epilogue, rngState: rng.state() };
}

/** 한 달 진행. 작업용 사본을 고쳐 쓴다. 남은 아이들의 이야기에서는 견생 지도를 그리지 않는다. */
function stepMonth(rng: Rng, work: RunState, { epilogue = false } = {}): void {
  work.month += 1;
  const alive = livingDogs(work);
  // 함께 사는 아이가 늘면 여유가 돌아가는 기준도 조금 낮아진다.
  const easeTarget = 60 - 5 * Math.max(0, alive.length - 1);
  work.household.ease = round2(
    clamp(work.household.ease + (easeTarget - work.household.ease) * 0.05 + rng.range(-2, 2)),
  );

  for (const dog of alive) {
    const breed = getBreed(dog.breedId);
    const previousStage = dog.stage;
    dog.ageMonths += 1;
    dog.stage = stageFor(breed.size, dog.ageMonths);
    dog.stats = driftStats(rng, dog, work.household.ease, breed.size, closestRapport(work, dog));
    dog.lifespanMonths = adjustLifespan(dog);

    if (dog.stage !== previousStage && dog.stage !== 'puppy') {
      work.log.push({
        month: work.month,
        dogId: dog.id,
        kind: 'stage',
        text: STAGE_TEXT[dog.stage](dog.name),
      });
    }
    // 떠나는 달에는 생일 문장을 남기지 않는다(같은 달에 "생일 축하해"와 이별이 겹치지 않게).
    if (dog.ageMonths % 12 === 0 && dog.ageMonths < dog.lifespanMonths) {
      work.log.push({
        month: work.month,
        dogId: dog.id,
        kind: 'birthday',
        text: `${josa(dog.name, '이/가')} ${dog.ageMonths / 12}살이 됐어요. 생일 축하해!`,
      });
    }
  }

  driftRapport(rng, work);
  eventPhase(rng, work);

  // 선택을 기다리는 달에는 이별을 미룬다. 선택 결과를 본 다음 달에 판단한다.
  if (!work.pendingChoice) {
    for (const dog of livingDogs(work)) {
      if (dog.ageMonths >= dog.lifespanMonths) {
        dog.passedMonth = work.month;
        work.log.push({
          month: work.month,
          dogId: dog.id,
          kind: 'passed',
          text: PASSED_TEXT[work.arc](dog.name),
        });
        scheduleMissing(work, dog);
      }
    }
  }

  if (!epilogue) {
    const first = work.dogs[0];
    work.timeline.push({
      month: work.month,
      stage: first.stage,
      mood: moodFor(first.stats.happiness),
    });
  }
}

/**
 * 한 달을 진행한다. 입력 상태는 바꾸지 않고 새 상태를 돌려준다.
 * 선택이나 새 식구 이름을 기다리는 중이면 진행하지 않는다.
 */
export function advanceMonth(state: RunState): RunState {
  if (state.status === 'ended' || state.pendingChoice || state.pendingMeeting) {
    return state;
  }
  const rng = createRng(state.rngState);
  const work = workingCopy(state);
  stepMonth(rng, work);
  return finishMonth(rng, work);
}

/** 고른 선택지로 기다리던 사건을 마무리한다. 작업용 사본을 고쳐 쓴다. */
function applyChoice(rng: Rng, work: RunState, choice: Choice): void {
  const pending = work.pendingChoice!;
  const event = getEvent(pending.eventId);
  const dog = work.dogs.find((entry) => entry.id === pending.dogId)!;
  const partner = work.dogs.find((entry) => entry.id === pending.partnerId);
  const rapport = partner ? rapportBetween(work, dog.id, partner.id) : undefined;
  const outcome = rng.weighted(choice.outcomes, (entry) => outcomeWeight(entry, dog, rapport));
  const label = pending.choices.find((entry) => entry.id === choice.id)!.label;
  const passes = outcome.effects?.pass ?? false;

  applyEffects(rng, work, dog, outcome.effects, partner);
  if (outcome.follow) {
    work.scheduled.push({
      eventId: outcome.follow.event,
      dogId: dog.id,
      ...(partner && { partnerId: partner.id }),
      month: work.month + outcome.follow.inMonths,
    });
  }
  work.log.push({
    month: work.month,
    dogId: dog.id,
    ...(partner && { partnerId: partner.id }),
    kind: passes ? 'passed' : 'choice',
    text: render(outcome.text, dog.name, partner?.name),
    choice: label,
    eventId: event.id,
    tone: pending.tone,
    memorable: outcome.memorable ?? event.memorable,
  });
  if (passes) {
    scheduleMissing(work, dog);
  }
  if (outcome.effects?.adopt) {
    work.pendingMeeting = {
      month: work.month,
      eventId: event.id,
      hostId: dog.id,
      meeting: drawMeeting(rng, {
        ...outcome.effects.adopt,
        takenNames: work.dogs.map((entry) => entry.name),
      }),
    };
  }
  work.pendingChoice = null;
}

function resolveChoice(rng: Rng, state: RunState, choice: Choice): RunState {
  const work = workingCopy(state);
  applyChoice(rng, work, choice);
  return finishMonth(rng, work);
}

/** 자동 결정이 고를 선택지. autoWeight가 0인 선택지(편안하게 보내 주기)는 고르지 않는다. */
function pickAuto(rng: Rng, pending: PendingChoice): Choice {
  const options = (getEvent(pending.eventId).choices ?? []).filter(
    (choice) => (choice.autoWeight ?? 1) > 0,
  );
  return rng.weighted(options, (entry) => entry.autoWeight ?? 1);
}

/** 플레이어가 고른 선택지로 기다리던 사건을 마무리한다. */
export function choose(state: RunState, choiceId: string): RunState {
  const pending = state.pendingChoice;
  if (!pending) {
    throw new Error('선택을 기다리는 사건이 없습니다.');
  }
  const choice = getEvent(pending.eventId).choices?.find((entry) => entry.id === choiceId);
  if (!choice) {
    throw new Error(`이 사건에 없는 선택지입니다: ${choiceId}`);
  }
  return resolveChoice(createRng(state.rngState), state, choice);
}

/**
 * 자동 결정. 선택지의 autoWeight(기본 1)로 고른다. 0인 선택지(편안하게 보내 주기)는
 * 자동으로 고르지 않는다. 화면은 alwaysAsk 사건이면 자동 결정 중에도 플레이어에게 묻는다.
 */
export function autoChoose(state: RunState): RunState {
  const pending = state.pendingChoice;
  if (!pending) {
    throw new Error('선택을 기다리는 사건이 없습니다.');
  }
  const rng = createRng(state.rngState);
  return resolveChoice(rng, state, pickAuto(rng, pending));
}

const ARRIVED_FROM: Record<Route, string> = {
  shelter: '보호소에서 온',
  rural: '시골 마당에서 온',
  rescue: '길에서 만난',
  acquaintance: '아는 분 댁에서 온',
};

/**
 * 새 식구의 이름을 짓고 가족으로 맞는다. 비었거나 가족 중에 같은 이름이 있으면 추천 이름을 쓴다.
 * 함께 사는 아이들과 사이가 생기고, 다음 달에 새 식구를 들이게 된 아이와 첫 대면을 한다.
 */
export function welcome(state: RunState, name: string): RunState {
  const pending = state.pendingMeeting;
  if (!pending) {
    throw new Error('이름을 기다리는 새 식구가 없습니다.');
  }
  const rng = createRng(state.rngState);
  const work = workingCopy(state);
  const taken = work.dogs.map((dog) => dog.name);
  const trimmed = name.trim();
  const finalName =
    trimmed && !taken.includes(trimmed) ? trimmed : pending.meeting.suggestedNames[0];
  const dog = createDog(rng, pending.meeting, `dog-${work.dogs.length + 1}`, finalName, work.month);

  for (const resident of livingDogs(work)) {
    work.pairs.push({ dogIds: [resident.id, dog.id], rapport: firstRapport(rng, resident, dog) });
  }
  work.dogs.push(dog);
  work.log.push({
    month: work.month,
    dogId: dog.id,
    partnerId: pending.hostId,
    kind: 'meet',
    text: `${ARRIVED_FROM[dog.route]} ${josa(finalName, '이/가')} 새 식구가 됐어요.`,
    memorable: true,
  });
  work.scheduled.push({
    eventId: FIRST_MEETING,
    dogId: pending.hostId,
    partnerId: dog.id,
    month: work.month + 1,
  });
  work.pendingMeeting = null;
  return finishMonth(rng, work);
}

/** 자동 결정: 새 식구에게 첫 번째 추천 이름을 지어 준다. */
export function autoWelcome(state: RunState): RunState {
  return welcome(state, '');
}

/** 선택 사건이나 새 식구가 나오거나 판이 끝날 때까지 진행한다. */
export function advanceUntilChoice(state: RunState): RunState {
  let current = state;
  while (
    current.status === 'running' &&
    !current.pendingChoice &&
    !current.pendingMeeting &&
    current.month < MAX_MONTHS
  ) {
    current = advanceMonth(current);
  }
  return current;
}

/** 끝까지 한 번에 진행한다. 선택과 새 식구 이름은 자동 결정으로 정한다(테스트·미리보기용). */
export function simulateToEnd(state: RunState): RunState {
  let current = state;
  while (current.status === 'running' && current.month < MAX_MONTHS) {
    if (current.pendingMeeting) {
      current = autoWelcome(current);
    } else if (current.pendingChoice) {
      current = autoChoose(current);
    } else {
      current = advanceMonth(current);
    }
  }
  return current;
}

export function arcTitle(arc: Arc): string {
  return ARCS[arc].title;
}
