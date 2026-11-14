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

  // 반죽을 붓고, 덜 익었을 때는 못 꺼내다가, 익으면 꺼낸다. 날마다 손님이 달라서, 팥 손님이 있으면
  // 바로 건네지고 없으면 거치대에 올라간다.
  await page.getByRole('button', { name: '반죽 붓기' }).first().click();
  await page.clock.runFor(500);
  await page.getByRole('button', { name: /붕어빵 굽는 중/ }).click();
  await expect(page.getByRole('status')).toHaveText('아직 덜 익었어요');
  await page.clock.runFor(2500);
  await page.getByRole('button', { name: /붕어빵 꺼내기/ }).click();
  await expect(page.getByRole('status')).toHaveText(/🛍️|거치대로/);
  await expect(page.getByRole('listitem', { name: /개 주문/ }).first()).toBeVisible();

  await page.clock.fastForward(90_000);
  await page.clock.runFor(100);
  // 손님을 계속 놓치면 목숨 5개를 다 잃고 일찍 문을 닫는다.
  await expect(page.getByRole('heading', { name: '목숨을 다 썼어요' })).toBeVisible();
  await expect(page.getByText(/놓친 손님 5팀/)).toBeVisible();
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
        points: 600,
        totalRevenue: 0,
        upgrades: { rack: 0, pans: 0, batter: 0, warmer: 0 },
      }),
    ],
  );
  await page.reload();

  await page.getByRole('button', { name: /상점 · 600P/ }).click();
  await page.getByRole('button', { name: '틀 늘리기 300P에 사기' }).click();
  await page.getByRole('button', { name: '거치대 넓히기 250P에 사기' }).click();
  await expect(page.getByText('50P', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '돌아가기' }).click();

  await page.getByRole('button', { name: /내 가게 영업/ }).click();
  await expect(page.getByRole('button', { name: '반죽 붓기' })).toHaveCount(5);
  await expect(page.getByRole('list', { name: '거치대 (0/4)' })).toBeVisible();
});

test('a newcomer finishes the tutorial with keyboard shortcuts', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  await page.getByRole('button', { name: /튜토리얼부터/ }).click();
  const coach = page.getByRole('list', { name: '튜토리얼 단계' });
  await expect(coach.locator('[aria-current="step"]')).toContainText('팥 반죽');

  await page.keyboard.press('q'); // 1번 틀에 팥
  await page.clock.runFor(3000);
  await page.keyboard.press('q'); // 꺼내면 팥 손님에게 바로 간다
  await expect(coach.locator('[aria-current="step"]')).toContainText('슈크림');

  await page.keyboard.press('2'); // 슈크림
  await page.keyboard.press('w');
  await page.clock.runFor(3000);
  await page.keyboard.press('w');
  // 다 끝내도 판에서 튕겨 나가지 않고, 판 위에 완료 안내가 뜬다.
  const done = page.getByRole('dialog', { name: '🎉 튜토리얼 완료!' });
  await expect(done).toBeVisible();
  await expect(coach).toBeVisible();

  // 바로 오늘의 장사로 넘어가고, 뒤로가기(그만두기)는 튜토리얼이 아니라 처음 화면으로 간다.
  await done.getByRole('button', { name: '오늘의 장사 시작' }).click();
  await expect(page).toHaveURL(/\/play$/);
  await page.goBack();
  await page.getByRole('button', { name: '그만두기' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('button', { name: /튜토리얼 다시 보기/ })).toBeVisible();
});

test('asks before the back button throws away a running shift, with the clock stopped', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  await page.getByRole('button', { name: '오늘의 장사 시작' }).click();
  await page.clock.runFor(10_000);
  await expect(page.getByText('80초')).toBeVisible();

  await page.goBack();
  const ask = page.getByRole('alertdialog', { name: '오늘의 장사를 그만둘까요?' });
  await expect(ask).toBeVisible();
  await expect(ask).toContainText('기록에 남지 않고');
  await expect(page).toHaveURL(/\/play$/);
  // 묻는 동안은 시계가 멈춰 손님도 떠나지 않는다.
  await page.clock.runFor(20_000);
  await expect(page.getByText('80초')).toBeVisible();
  await ask.getByRole('button', { name: '계속 장사하기' }).click();
  await expect(ask).toBeHidden();
  await page.clock.runFor(5_000);
  await expect(page.getByText('75초')).toBeVisible();

  // Esc로도 묻고, Esc는 계속하기다.
  await page.keyboard.press('Escape');
  await expect(ask).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(ask).toBeHidden();

  // 그만두면 기록 없이 처음 화면으로.
  await page.goBack();
  await ask.getByRole('button', { name: '그만두기' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText('아직 없음')).toBeVisible();
});

test('a shift starts at the top even when the start screen was scrolled down on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/');
  const own = page.getByRole('button', { name: /내 가게 영업/ });
  await own.scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

  await own.click();
  await expect(page.getByRole('button', { name: /반죽 붓기/ }).first()).toBeVisible();
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await expect(page.locator('.play__hud')).toBeInViewport();
});

test('the browser back button walks between the start screen, the shop and the tutorial', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /상점/ }).click();
  await expect(page).toHaveURL(/\/shop$/);
  await page.goBack();
  await expect(page.getByRole('button', { name: /튜토리얼부터/ })).toBeVisible();
  await page.goForward();
  await expect(page.getByRole('button', { name: '돌아가기' })).toBeVisible();

  // 주소로 바로 열 수 있고, 새로고침해도 그 화면이다.
  await page.goto('/tutorial');
  await expect(page.getByRole('list', { name: '튜토리얼 단계' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('list', { name: '튜토리얼 단계' })).toBeVisible();

  // 장사 화면은 판 상태가 없으면 열 수 없어 처음 화면으로 간다.
  await page.goto('/play');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('button', { name: '오늘의 장사 시작' })).toBeVisible();
});

test('racks a fish nobody is waiting for, throws it away, and leaves the tutorial', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  await page.getByRole('button', { name: /튜토리얼부터/ }).click();
  await page.keyboard.press('q');
  await page.keyboard.press('w'); // 팥 두 개: 팥 손님은 하나뿐
  await page.clock.runFor(3000);
  await page.keyboard.press('q');
  await expect(page.getByRole('status')).toContainText('완벽');
  // 완벽 플래시는 잠깐만: 알림과 key가 겹쳐 플래시가 쌓이던 버그가 없어야 한다.
  await page.clock.runFor(500);
  await expect(page.locator('.hitflash')).toHaveCount(0);
  await expect(page.getByRole('listitem', { name: /^팥 1개 주문/ })).toHaveCount(0);
  await page.keyboard.press('w');
  await expect(page.getByRole('status')).toContainText('거치대로');
  await expect(page.getByRole('list', { name: '거치대 (1/3)' })).toBeVisible();

  // 거치대의 붕어빵은 눌러서 버린다.
  await page.getByRole('button', { name: /^팥 .* 버리기$/ }).click();
  await expect(page.getByRole('status')).toHaveText('버렸어요');
  await expect(page.getByRole('list', { name: '거치대 (0/3)' })).toBeVisible();

  await page.getByRole('button', { name: '나가기' }).click();
  await expect(page.getByRole('button', { name: /튜토리얼부터/ })).toBeVisible();
});
