import { EVENTS } from './catalog';
import { render } from './template';
import type { EventCard } from './types';

/** 게임 안 어떤 문장에도 나오면 안 되는 말. 선택지로도 문장으로도 쓰지 않는다. */
const FORBIDDEN = [
  '파양',
  '유기',
  '버리',
  '버려',
  '학대',
  '방치',
  '때리',
  '때려',
  '굶기',
  '굶겨',
  '펫숍',
  '펫샵',
  '안락사',
  '똥개',
];

function allTexts(event: EventCard): string[] {
  return [
    ...event.text,
    ...(event.choices ?? []).flatMap((choice) => [
      choice.label,
      ...choice.outcomes.map((outcome) => outcome.text),
    ]),
  ];
}

describe('event catalog', () => {
  it('has at least 80 events with unique ids', () => {
    const ids = EVENTS.map((event) => event.id);
    expect(ids.length).toBeGreaterThanOrEqual(80);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every event stages, tones and text that render for any name', () => {
    for (const event of EVENTS) {
      expect(event.stages.length).toBeGreaterThan(0);
      expect(event.tones.length).toBeGreaterThan(0);
      expect(event.text.length).toBeGreaterThan(0);
      for (const text of allTexts(event)) {
        expect(text.trim()).not.toBe('');
        // 짝 이름({other})은 두 아이 사건에만 있다. 다른 사건에서 쓰면 render가 실패한다.
        const other = event.pair ? '두부' : undefined;
        for (const name of ['보리', '콩', 'Coco']) {
          expect(() => render(text, name, other), `${event.id}: ${text}`).not.toThrow();
          expect(render(text, name, other)).not.toMatch(/[{}]/);
        }
      }
    }
  });

  it('offers two or three caring choices with valid outcomes', () => {
    for (const event of EVENTS.filter((entry) => entry.choices)) {
      const choices = event.choices!;
      expect(choices.length).toBeGreaterThanOrEqual(2);
      expect(choices.length).toBeLessThanOrEqual(3);
      expect(new Set(choices.map((choice) => choice.id)).size).toBe(choices.length);
      for (const choice of choices) {
        expect(choice.outcomes.length).toBeGreaterThan(0);
        for (const outcome of choice.outcomes) {
          expect(outcome.weight).toBeGreaterThan(0);
          if (outcome.follow) {
            expect(EVENTS.some((entry) => entry.id === outcome.follow!.event)).toBe(true);
          }
        }
      }
    }
  });

  it('never uses words for abandoning, abusing or neglecting a dog', () => {
    for (const event of EVENTS) {
      for (const text of allTexts(event)) {
        for (const word of FORBIDDEN) {
          expect(text, `${event.id}: ${text}`).not.toContain(word);
        }
      }
    }
  });

  it('only lets a dog pass through the euthanasia choice, and only in its strict case', () => {
    for (const event of EVENTS) {
      expect(event.effects?.pass, event.id).toBeFalsy();
      for (const choice of event.choices ?? []) {
        const passes = choice.outcomes.some((outcome) => outcome.effects?.pass);
        const isEuthanasia = choice.tags?.includes('euthanasia') ?? false;
        expect(passes, `${event.id}/${choice.id}`).toBe(isEuthanasia);
        if (!isEuthanasia) {
          continue;
        }
        expect(choice.autoWeight).toBe(0);
        expect(event.alwaysAsk).toBe(true);
        expect(event.stages).toEqual(['elderly']);
        expect(event.when?.requires).toContain('terminal-illness');
        expect(event.when?.max?.health).toBeLessThanOrEqual(35);
        const others = event.choices!.filter((entry) => !entry.tags?.includes('euthanasia'));
        expect(others.length).toBeGreaterThan(0);
      }
    }
  });

  it('only requires flags that some event can set', () => {
    // 엔진이 직접 다는 표시: 불치병, 나이 지긋해서 가족이 된 아이.
    const dogFlags = new Set<string>(['terminal-illness', 'senior-adopted']);
    const householdFlags = new Set<string>();
    for (const event of EVENTS) {
      const effects = [
        event.effects,
        ...(event.choices ?? []).flatMap((choice) => choice.outcomes.map((o) => o.effects)),
      ];
      for (const effect of effects) {
        effect?.flags?.forEach((flag) => dogFlags.add(flag));
        effect?.householdFlags?.forEach((flag) => householdFlags.add(flag));
      }
    }
    for (const event of EVENTS) {
      for (const flag of [...(event.when?.requires ?? []), ...(event.when?.excludes ?? [])]) {
        expect(dogFlags.has(flag), `${event.id}: ${flag}`).toBe(true);
      }
      for (const flag of [
        ...(event.when?.household ?? []),
        ...(event.when?.householdExcludes ?? []),
      ]) {
        expect(householdFlags.has(flag), `${event.id}: ${flag}`).toBe(true);
      }
    }
  });

  it('keeps two-dog events off the urgent list', () => {
    for (const event of EVENTS.filter((entry) => entry.pair)) {
      expect(event.urgent, event.id).toBeUndefined();
    }
  });

  it('offers a new family member only as a choice after a year, with a way to wait', () => {
    const adopting = EVENTS.filter((event) =>
      event.choices?.some((choice) => choice.outcomes.some((outcome) => outcome.effects?.adopt)),
    );
    expect(adopting.length).toBeGreaterThan(0);
    for (const event of EVENTS) {
      expect(event.effects?.adopt, event.id).toBeUndefined();
    }
    for (const event of adopting) {
      expect(event.urgent, event.id).toBeUndefined();
      expect(event.household, event.id).toBe(true);
      expect(event.stages, event.id).not.toContain('puppy');
      expect(event.when?.minTogether, event.id).toBeGreaterThanOrEqual(12);
      expect(event.when?.min?.ease, event.id).toBeGreaterThanOrEqual(50);
      const waits = event.choices!.filter(
        (choice) => !choice.outcomes.some((outcome) => outcome.effects?.adopt),
      );
      expect(waits.length, event.id).toBeGreaterThan(0);
    }
  });
});
