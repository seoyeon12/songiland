import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { runAboutToEnd } from '../../src/test/runs';

const RUN_KEY = 'songiland:gyeonsaeng:run';

test('meets a dog, names it and resumes the life after a reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '만나러 가기' }).click();
  await page.getByLabel('이름을 지어 주세요').fill('보리');
  await page.getByRole('button', { name: '보리와 가족이 되기' }).click();
  await expect(page.getByRole('heading', { name: '보리', exact: true })).toBeVisible();
  await expect(page.getByText('보리와 가족이 됐어요.')).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: '보리와의 견생 이어 보기' }).click();
  await expect(page.getByRole('heading', { name: '보리', exact: true })).toBeVisible();
});

test('ends a life at 4x, saves the share card and keeps it in past lives', async ({ page }) => {
  // 한 판을 끝까지 보면 4배속으로도 몇 분이 걸리므로, 막을 내리기 한 달 전의 판에서 이어 본다.
  const run = JSON.stringify(runAboutToEnd(8, '하루'));
  await page.goto('/');
  await page.evaluate(([key, value]) => localStorage.setItem(key, value), [RUN_KEY, run]);
  await page.reload();
  await page.getByRole('button', { name: '하루와의 견생 이어 보기' }).click();
  await page.getByLabel('4배속').check();

  await expect(page.getByRole('heading', { name: '하루의 견생' })).toBeVisible();
  await expect(page.getByText(/^이번 상영작 · /)).toBeVisible();
  await expect(page.getByRole('list', { name: /견생 지도/ })).toBeVisible();

  // 공유 카드는 이 브라우저의 캔버스로 그린 1080×1350 PNG다.
  const save = page.getByRole('button', { name: '이미지로 저장' });
  await expect(save).toBeEnabled();
  const [download] = await Promise.all([page.waitForEvent('download'), save.click()]);
  expect(download.suggestedFilename()).toBe('견생극장-하루.png');
  const png = await readFile(await download.path());
  expect(png.subarray(1, 4).toString('latin1')).toBe('PNG');
  expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1080, 1350]);

  await page.getByRole('button', { name: '한 번 더 상영하기' }).click();
  await expect(page.getByRole('button', { name: /이어 보기/ })).toHaveCount(0);
  await page
    .getByRole('region', { name: '지난 견생' })
    .getByRole('button', { name: /^하루의 견생/ })
    .click();
  await expect(page.getByText(/^지난 상영작 · /)).toBeVisible();
  await page.getByRole('button', { name: '목록으로 돌아가기' }).click();
  await expect(page.getByRole('button', { name: '만나러 가기' })).toBeVisible();
});

test('links back to the Songiland portal', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: /송이랜드/ })).toHaveAttribute(
    'href',
    'https://songiland.arosys.kr/',
  );
});
