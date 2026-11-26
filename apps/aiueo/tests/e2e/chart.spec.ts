import { expect, test } from '@playwright/test';

test('opens straight onto the hiragana chart', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: '아이우에오' })).toBeVisible();
  const chart = page.getByRole('table', { name: '히라가나 청음 오십음도' });
  const kana = chart.locator('[lang="ja"]');
  await expect(kana).toHaveCount(46);
  await expect(kana.first()).toHaveText('あ');
  await expect(kana.last()).toHaveText('ん');
  await expect(kana.last()).toBeVisible();
});

test('fits the phone screen without sideways scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/');
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test('links back to the Songiland portal', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: /송이랜드/ })).toHaveAttribute(
    'href',
    'https://songiland.arosys.kr/',
  );
});
