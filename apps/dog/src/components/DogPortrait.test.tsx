import { render, screen } from '@testing-library/react';
import { BREEDS, type Mood, type Stage } from '../engine';
import { isDark, mix } from './color';
import { DogPortrait } from './DogPortrait';

const STAGES: Stage[] = ['puppy', 'adult', 'senior', 'elderly'];
const MOODS: Mood[] = ['great', 'good', 'okay', 'low'];

it('draws every breed, coat, look, age and mood', () => {
  for (const breed of BREEDS) {
    for (const coat of breed.coats) {
      for (const ears of breed.ears) {
        for (const coatType of breed.coatTypes) {
          for (const tail of breed.tails) {
            const { container, unmount } = render(
              <DogPortrait
                breedId={breed.id}
                coatId={coat.id}
                look={{ ears, coatType, tail, legs: breed.legs }}
                stage={STAGES[(coat.id.length + ears.length) % STAGES.length]}
                mood={MOODS[(coatType.length + tail.length) % MOODS.length]}
                label={`${breed.name} ${coat.label}`}
              />,
            );
            expect(container.querySelector('svg')).not.toBeNull();
            unmount();
          }
        }
      }
    }
  }
});

it('describes the dog for screen readers', () => {
  render(
    <DogPortrait
      breedId="bichon"
      coatId="white"
      look={{ ears: 'drop', coatType: 'curly', tail: 'curled', legs: 'normal' }}
      stage="elderly"
      mood="good"
      label="보리, 하양 비숑 프리제"
    />,
  );
  expect(screen.getByRole('img', { name: '보리, 하양 비숑 프리제' })).toBeVisible();
});

it('mixes colors and spots dark coats', () => {
  expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
  expect(mix('#d9a35b', '#d9a35b', 0.3)).toBe('#d9a35b');
  expect(isDark('#231f1d')).toBe(true);
  expect(isDark('#f6f3ec')).toBe(false);
});

it('hides a decorative portrait from screen readers', () => {
  const breed = BREEDS[0];
  const { container } = render(
    <DogPortrait
      breedId={breed.id}
      coatId={breed.coats[0].id}
      look={{ ears: 'erect', coatType: 'short', tail: 'curled', legs: 'normal' }}
      stage="adult"
      mood="good"
      framing="face"
    />,
  );
  const svg = container.querySelector('svg')!;
  expect(svg).toHaveAttribute('aria-hidden', 'true');
  expect(svg).not.toHaveAttribute('role');
  // 얼굴만 보이게 자른 그림은 전체(0 0 200 200)보다 좁은 자리를 본다.
  const [, , width] = svg.getAttribute('viewBox')!.split(' ').map(Number);
  expect(width).toBeLessThan(200);
});
