import { expect, test } from '@playwright/test';

const firstMain = /^본번호 1: \d+$/;

test('desktop Space draws all numbers at once without scrolling the page', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('listitem', { name: '본번호 1 빈 자리' })).toBeVisible();
  await page.keyboard.press('Space');
  await expect(page.getByRole('listitem', { name: firstMain })).toBeVisible();
  await expect(page.getByRole('img', { name: /^보너스 번호: \d+$/ })).toBeVisible();
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test('mobile tap on the draw button shows new numbers', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: '번호 뽑기' }).tap();
  await expect(page.getByRole('listitem', { name: firstMain })).toBeVisible();
  await expect(page.getByRole('button', { name: '다시 뽑기' })).toBeVisible();
});

test('links back to the Songiland portal', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: /송이랜드/ })).toHaveAttribute(
    'href',
    'https://songiland.arosys.kr/',
  );
});
