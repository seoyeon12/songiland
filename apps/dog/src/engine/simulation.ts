import { ARC_IDS, ARCS } from './data/arcs';
import { getBreed } from './data/breeds';
import { TRAITS } from './data/traits';
import { EVENTS } from './events/catalog';
import { getEvent, isAvailable, outcomeWeight, pickByTone } from './events/picker';
import { render } from './events/template';
import type { Choice, Effects, EventCard } from './events/types';
import { drawMeeting, MIN_MONTHS_TOGETHER } from './meeting';
import { createRng, type Rng } from './rng';
import { moodFor, stageFor } from './stages';
import { josa } from './text/josa';
import type {
  Arc,
  Dog,
  Meeting,
  PendingChoice,
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
/** 선택 사건 사이 최소 간격(개월)과, 간격이 지난 뒤 달마다 일어날 확률. */
const CHOICE_GAP = 6;
const CHOICE_CHANCE = 0.3;

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
    flags: [],
    seen: {},
  };

  return {
    version: 1,
    seed,
    rngState: rng.state(),
    month: 0,
    arc,
    dogs: [dog],
    household: { ease: round2(60 + rng.range(-5, 5)), flags: [] },
    log: [
      { month: 0, dogId: dog.id, kind: 'meet', text: `${josa(trimmed, '과/와')} 가족이 됐어요.` },
    ],
    timeline: [{ month: 0, stage, mood: moodFor(dog.stats.happiness) }],
    status: 'running',
    pendingChoice: null,
    scheduled: [],
    lastChoiceMonth: 0,
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

/** 사건이 없는 한 달 동안의 자연스러운 변화. 사건 효과는 그 위에 더해진다. */
function driftStats(rng: Rng, dog: Dog, ease: number, size: Size): Stats {
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
    (has('foodie') || has('easygoing') ? 5 : 0);
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
    log: [...state.log],
    timeline: [...state.timeline],
    scheduled: [...state.scheduled],
  };
}

const STAT_KEYS: readonly StatKey[] = ['health', 'happiness', 'bond', 'sociability'];

function applyEffects(rng: Rng, work: RunState, dog: Dog, effects: Effects | undefined): void {
  if (!effects) {
    return;
  }
  for (const key of STAT_KEYS) {
    const delta = effects[key];
    if (delta) {
      dog.stats[key] = round2(clamp(dog.stats[key] + delta));
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

function fireEvent(rng: Rng, work: RunState, event: EventCard, dog: Dog, tone: Tone): void {
  dog.seen[event.id] = work.month;
  const text = render(rng.pick(event.text), dog.name);
  if (event.choices) {
    const pending: PendingChoice = {
      eventId: event.id,
      dogId: dog.id,
      month: work.month,
      tone,
      text,
      choices: event.choices.map((choice) => ({
        id: choice.id,
        label: render(choice.label, dog.name),
      })),
      alwaysAsk: event.alwaysAsk ?? false,
    };
    work.pendingChoice = pending;
    work.lastChoiceMonth = work.month;
    return;
  }
  applyEffects(rng, work, dog, event.effects);
  work.log.push({
    month: work.month,
    dogId: dog.id,
    kind: 'event',
    text,
    eventId: event.id,
    tone,
    memorable: event.memorable,
  });
}

/** 한 달에 사건은 많아야 하나. 이어지는 사건 → 급한 사건 → 선택 사건 → 일상 사건 순서로 본다. */
function eventPhase(rng: Rng, work: RunState): void {
  const alive = work.dogs.filter((dog) => dog.passedMonth === null);
  if (alive.length === 0) {
    return;
  }

  const dueIndex = work.scheduled.findIndex((entry) => entry.month <= work.month);
  if (dueIndex >= 0) {
    const [due] = work.scheduled.splice(dueIndex, 1);
    const dog = alive.find((entry) => entry.id === due.dogId);
    const event = getEvent(due.eventId);
    if (dog && event.stages.includes(dog.stage) && isAvailable(event, dog, work)) {
      fireEvent(rng, work, event, dog, event.tones[0]);
      return;
    }
  }

  const dog = rng.pick(alive);

  for (const event of EVENTS) {
    if (event.urgent && isAvailable(event, dog, work) && rng.chance(event.urgent.chance)) {
      fireEvent(rng, work, event, dog, event.tones[0]);
      return;
    }
  }

  if (work.month - work.lastChoiceMonth >= CHOICE_GAP && rng.chance(CHOICE_CHANCE)) {
    const candidates = EVENTS.filter(
      (event) => event.choices && !event.urgent && isAvailable(event, dog, work),
    );
    const picked = pickByTone(rng, candidates, dog, work.arc);
    if (picked) {
      fireEvent(rng, work, picked.event, dog, picked.tone);
      return;
    }
  }

  if (rng.chance(DAILY_CHANCE)) {
    const candidates = EVENTS.filter(
      (event) => !event.choices && !event.urgent && isAvailable(event, dog, work),
    );
    const picked = pickByTone(rng, candidates, dog, work.arc);
    if (picked) {
      fireEvent(rng, work, picked.event, dog, picked.tone);
    }
  }
}

function finishMonth(rng: Rng, work: RunState): RunState {
  const first = work.dogs[0];
  // 판은 첫째의 견생을 기준으로 끝난다(다견가정이어도 10~15분을 지키기 위해).
  const ended = first.passedMonth !== null;
  return {
    ...work,
    rngState: rng.state(),
    status: ended ? 'ended' : 'running',
  };
}

/**
 * 한 달을 진행한다. 입력 상태는 바꾸지 않고 새 상태를 돌려준다.
 * 선택을 기다리는 사건이 있으면 진행하지 않는다(choose 또는 autoChoose가 먼저).
 */
export function advanceMonth(state: RunState): RunState {
  if (state.status === 'ended' || state.pendingChoice) {
    return state;
  }
  const rng = createRng(state.rngState);
  const work = workingCopy(state);
  work.month += 1;
  work.household.ease = round2(
    clamp(work.household.ease + (60 - work.household.ease) * 0.05 + rng.range(-2, 2)),
  );

  for (const dog of work.dogs) {
    if (dog.passedMonth !== null) {
      continue;
    }
    const breed = getBreed(dog.breedId);
    const previousStage = dog.stage;
    dog.ageMonths += 1;
    dog.stage = stageFor(breed.size, dog.ageMonths);
    dog.stats = driftStats(rng, dog, work.household.ease, breed.size);
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

  eventPhase(rng, work);

  // 선택을 기다리는 달에는 이별을 미룬다. 선택 결과를 본 다음 달에 판단한다.
  if (!work.pendingChoice) {
    for (const dog of work.dogs) {
      if (dog.passedMonth === null && dog.ageMonths >= dog.lifespanMonths) {
        dog.passedMonth = work.month;
        work.log.push({
          month: work.month,
          dogId: dog.id,
          kind: 'passed',
          text: PASSED_TEXT[work.arc](dog.name),
        });
      }
    }
  }

  const first = work.dogs[0];
  work.timeline.push({
    month: work.month,
    stage: first.stage,
    mood: moodFor(first.stats.happiness),
  });
  return finishMonth(rng, work);
}

function resolveChoice(rng: Rng, state: RunState, choice: Choice): RunState {
  const pending = state.pendingChoice!;
  const event = getEvent(pending.eventId);
  const work = workingCopy(state);
  const dog = work.dogs.find((entry) => entry.id === pending.dogId)!;
  const outcome = rng.weighted(choice.outcomes, (entry) => outcomeWeight(entry, dog));
  const label = pending.choices.find((entry) => entry.id === choice.id)!.label;

  applyEffects(rng, work, dog, outcome.effects);
  if (outcome.follow) {
    work.scheduled.push({
      eventId: outcome.follow.event,
      dogId: dog.id,
      month: work.month + outcome.follow.inMonths,
    });
  }
  work.log.push({
    month: work.month,
    dogId: dog.id,
    kind: outcome.effects?.pass ? 'passed' : 'choice',
    text: render(outcome.text, dog.name),
    choice: label,
    eventId: event.id,
    tone: pending.tone,
    memorable: outcome.memorable ?? event.memorable,
  });
  work.pendingChoice = null;
  return finishMonth(rng, work);
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
  const options = (getEvent(pending.eventId).choices ?? []).filter(
    (choice) => (choice.autoWeight ?? 1) > 0,
  );
  const choice = rng.weighted(options, (entry) => entry.autoWeight ?? 1);
  return resolveChoice(rng, state, choice);
}

/** 선택 사건이 나오거나 판이 끝날 때까지 진행한다. */
export function advanceUntilChoice(state: RunState): RunState {
  let current = state;
  while (
    current.status === 'running' &&
    !current.pendingChoice &&
    current.month < MAX_MONTHS
  ) {
    current = advanceMonth(current);
  }
  return current;
}

/** 끝까지 한 번에 진행한다. 선택은 자동 결정으로 고른다(테스트·미리보기용). */
export function simulateToEnd(state: RunState): RunState {
  let current = state;
  while (current.status === 'running' && current.month < MAX_MONTHS) {
    current = current.pendingChoice ? autoChoose(current) : advanceMonth(current);
  }
  return current;
}

export function arcTitle(arc: Arc): string {
  return ARCS[arc].title;
}
