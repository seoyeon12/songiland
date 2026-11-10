import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

const WALLET_KEY = 'songiland:bbang:wallet:v1';

test("plays today's shift, saves the share card and races its ghost next time", async ({ page }) => {
  // 90초 장사를 기다리지 않도록 브라우저 시계(rAF·performance.now 포함)를 직접 돌린다.
  await page.clock.install();
  await page.goto('/');
  await expect(page.getByText('아직 없음')).toBeVisible();

  await page.getByRole('button', { name: '오늘의 장사 시작' }).click();
  await expect(page.getByRole('button', { name: '반죽 붓기' })).toHaveCount(4); // 표준 가게

  // 반죽을 붓고, 덜 익었을 때는 못 꺼내다가, 익으면 거치대로 꺼낸다.
  await page.getByRole('button', { name: '반죽 붓기' }).first().click();
  await page.clock.runFor(500);
  await page.getByRole('button', { name: /붕어빵 굽는 중/ }).click();
  await expect(page.getByRole('status')).toHaveText('아직 덜 익었어요');
  await page.clock.runFor(3900);
  await page.getByRole('button', { name: /붕어빵 꺼내기/ }).click();
  await expect(page.getByRole('list', { name: '거치대 (1/3)' })).toBeVisible();

  await page.clock.fastForward(90_000);
  await page.clock.runFor(100);
  await expect(page.getByRole('heading', { name: '장사 끝!' })).toBeVisible();
  await expect(page.getByText('🎉 첫 기록!')).toBeVisible();
  await expect(page.getByLabel('오늘의 영수증')).toContainText('재료비');

  // 공유 카드는 이 브라우저의 캔버스로 그린 1080×1350 PNG다.
  const save = page.getByRole('button', { name: '이미지로 저장' });
  await expect(save).toBeEnabled();
  const [download] = await Promise.all([page.waitForEvent('download'), save.click()]);
  expect(download.suggestedFilename()).toMatch(/^붕어빵랭킹전-\d{4}-\d{2}-\d{2}\.png$/);
  const png = await readFile(await download.path());
  expect(png.subarray(1, 4).toString('latin1')).toBe('PNG');
  expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1080, 1350]);

  // 다시 도전하면 오늘 최고 기록 판이 고스트로 같이 달린다.
  await page.getByRole('button', { name: '다시 도전' }).click();
  await expect(page.getByText('👻 오늘 최고 기록')).toBeVisible();
});

test('spends shop points on upgrades that apply only to 내 가게', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(
    ([key, value]) => localStorage.setItem(key, value),
    [
      WALLET_KEY,
      JSON.stringify({
        points: 400,
        totalRevenue: 0,
        upgrades: { rack: 0, pans: 0, batter: 0, warmer: 0 },
      }),
    ],
  );
  await page.reload();

  await page.getByRole('button', { name: /상점 · 400P/ }).click();
  await page.getByRole('button', { name: '틀 늘리기 200P에 사기' }).click();
  await page.getByRole('button', { name: '거치대 넓히기 150P에 사기' }).click();
  await expect(page.getByText('50P', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '돌아가기' }).click();

  await page.getByRole('button', { name: /내 가게 영업/ }).click();
  await expect(page.getByRole('button', { name: '반죽 붓기' })).toHaveCount(5);
  await expect(page.getByRole('list', { name: '거치대 (0/4)' })).toBeVisible();
});
