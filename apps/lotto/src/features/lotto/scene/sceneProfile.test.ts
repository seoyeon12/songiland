import { getSceneProfile } from './sceneProfile';

it('removes nonessential visual load for low quality and reduced motion', () => {
  expect(getSceneProfile('low', false)).toMatchObject({
    backgroundBallCount: 18,
    shadows: false,
  });
  expect(getSceneProfile('high', true).cameraMotion).toBe('cut');
});

it('keeps the full show for high quality without reduced motion', () => {
  expect(getSceneProfile('high', false)).toMatchObject({
    backgroundBallCount: 45,
    shadows: true,
    cameraMotion: 'travel',
  });
});

it('reduced motion disables shadows and particles even at high quality', () => {
  const profile = getSceneProfile('high', true);
  expect(profile.shadows).toBe(false);
  expect(profile.particles).toBe(false);
});
