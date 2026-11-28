import { expect, test, type Page } from '@playwright/test';

const ROMAJI: Record<string, string> = { あ: 'a', い: 'i', う: 'u', え: 'e', お: 'o', ぬ: 'nu', め: 'me' };

/**
 * 헤드리스 Chromium에는 일본어 목소리가 없을 수 있다. 목소리 목록을 정해 둔 가짜 음성으로 바꾸고,
 * 읽은 글자를 `window.__spoken`에 남긴다.
 */
async function stubSpeech(page: Page, lang: string) {
  await page.addInitScript((voiceLang) => {
    const spoken: string[] = [];
    Object.assign(window, { __spoken: spoken });
    const voice = { lang: voiceLang, name: 'stub', default: true, localService: true, voiceURI: 'stub' };
    const fake = {
      getVoices: () => [voice],
      cancel: () => {},
      speak: (utterance: { text: string }) => void spoken.push(utterance.text),
    };
    // 진짜 SpeechSynthesisUtterance는 가짜 목소리 객체를 voice로 받지 않으므로 함께 바꾼다.
    class FakeUtterance {
      text: string;
      lang = '';
      rate = 1;
      voice: unknown = null;
      constructor(text: string) {
        this.text = text;
      }
    }
    Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      value: FakeUtterance,
      configurable: true,
    });
  }, lang);
}

function spoken(page: Page) {
  return page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken);
}

async function answerRead(page: Page) {
  const char = (await page.locator('.quiz__kana').textContent()) ?? '';
  const romaji = ROMAJI[char];
  if (!romaji) {
    throw new Error(`표에 없는 문자: ${char}`);
  }
  await page.getByRole('list', { name: '보기' }).getByRole('button', { name: romaji, exact: true }).click();
}

test('quizzes only the bookmarks carried over from the v1 save', async ({ page }) => {
  await stubSpeech(page, 'ja-JP');
  await page.goto('/');
  await page.evaluate(() =>
    localStorage.setItem(
      'songiland:aiueo:v1',
      JSON.stringify({ version: 1, bookmarks: ['hiragana-nu', 'hiragana-me'] }),
    ),
  );
  await page.goto('/mine');
  await expect(page.getByRole('link', { name: '내 문자 2자' })).toBeVisible();

  await page.getByRole('button', { name: '퀴즈 풀기' }).click();
  await expect(page).toHaveURL(/\/quiz\/mine\?shuffle=\d+$/);
  await expect(page.getByText('1 / 2')).toBeVisible();
  await answerRead(page);
  await expect(page.locator('[aria-live="polite"]')).toContainText('정답!');
  await page.getByRole('button', { name: '다음 문제' }).click();
  await answerRead(page);
  await page.getByRole('button', { name: '결과 보기' }).click();
  await expect(page.locator('.quiz__score')).toHaveText('2 / 2 맞혔어요');

  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('songiland:aiueo:v1') ?? '{}'),
  );
  expect(saved).toMatchObject({ version: 2, bookmarks: ['hiragana-nu', 'hiragana-me'] });
  expect(Object.keys(saved.mastery.reading).sort()).toEqual(['hiragana-me', 'hiragana-nu']);

  await page.getByRole('button', { name: '돌아가기' }).click();
  await expect(page).toHaveURL(/\/mine$/);
  await page.getByRole('link', { name: /문자표/ }).click();
  await expect(page.locator('[data-kana-id="hiragana-nu"]')).toHaveAttribute('data-level', '2');
  await expect(page.locator('[data-kana-id="hiragana-nu"] .chart__mark')).toBeVisible();
});

test('starts the listening quiz only from a tap and plays the next sound on 다음', async ({
  page,
}) => {
  await stubSpeech(page, 'ja-JP');
  await page.goto('/study');
  await page.getByText('듣고 고르기', { exact: true }).click();
  await page.getByRole('button', { name: /あ행/ }).click();
  await expect(page).toHaveURL(/\/quiz\/row-a\?mode=listen&shuffle=\d+$/);

  expect(await spoken(page)).toEqual([]);
  await expect(page.getByRole('list', { name: '보기' }).getByRole('button').first()).toBeDisabled();

  await page.getByRole('button', { name: '듣기' }).click();
  const [first] = await spoken(page);
  await page.getByRole('list', { name: '보기' }).getByRole('button', { name: first ?? '' }).click();
  await expect(page.locator('[aria-live="polite"]')).toContainText(`정답! ${first}`);
  await page.getByRole('button', { name: '다음 문제' }).click();
  expect(await spoken(page)).toHaveLength(2);
  await expect(page.getByRole('list', { name: '보기' }).getByRole('button').first()).toBeEnabled();
});

test('turns off sound-only quizzes on a device without a Japanese voice', async ({ page }) => {
  await stubSpeech(page, 'en-US');
  await page.goto('/study');
  await expect(page.getByRole('radio', { name: /듣고 고르기/ })).toBeDisabled();
  await page.getByText('보고 고르기', { exact: true }).click();
  await expect(page.getByRole('radio', { name: /^소리/ })).toBeDisabled();

  await page.goto('/quiz/row-a?mode=listen&shuffle=2');
  await page.getByRole('button', { name: '보고 고르기로 바꾸기' }).click();
  await expect(page).toHaveURL(/\/quiz\/row-a\?shuffle=2$/);
  await answerRead(page);
  await expect(page.locator('[aria-live="polite"]')).toContainText('정답!');
});

test('fits the quiz on a phone screen with large enough targets', async ({ page }) => {
  await stubSpeech(page, 'ja-JP');
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/quiz/seion?shuffle=8');
  await expect(page.getByText('1 / 10')).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  for (const button of await page.getByRole('list', { name: '보기' }).getByRole('button').all()) {
    const box = await button.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
  }
});
