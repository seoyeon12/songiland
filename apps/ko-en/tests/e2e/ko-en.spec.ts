import { expect, test } from '@playwright/test';

test('converts mistyped English keys to Hangul and copies the result', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('입력').fill('dkssudgktpdy');
  await expect(page.getByRole('status', { name: '결과' })).toHaveText('안녕하세요');
  await page.getByRole('button', { name: '결과 복사' }).click();
  await expect(page.getByRole('status', { name: '복사 안내' })).toHaveText('복사했어요.');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('안녕하세요');
});

test('converts Hangul back to English keys', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('입력').fill('한글');
  await expect(page.getByRole('status', { name: '결과' })).toHaveText('gksrmf');
});

test('links back to the Songiland portal', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: /송이랜드/ })).toHaveAttribute(
    'href',
    'https://songiland.arosys.kr/',
  );
});
