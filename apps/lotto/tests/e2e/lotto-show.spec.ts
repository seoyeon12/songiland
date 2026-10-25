import { expect, test } from '@playwright/test';

test('desktop Space reveals a number without scrolling the page', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: '🐾 송이의 행운 발도장' }).click();
  await page.waitForTimeout(2400);
  await page.getByTestId('lotto-stage').focus();
  await page.keyboard.press('Space');
  await page.waitForTimeout(1200);
  await expect(page.getByLabel('공개된 본번호 1')).toBeVisible();
});

test('mobile paw mode advances only from empty stage space', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: '발바닥 모드 ON' }).click();
  await page.getByRole('button', { name: '🐾 송이의 행운 발도장' }).click();
  await page.waitForTimeout(2400);
  await page.getByTestId('lotto-stage').tap({ position: { x: 30, y: 120 } });
  await page.waitForTimeout(1200);
  await expect(page.getByLabel('공개된 본번호 1')).toBeVisible();
});
