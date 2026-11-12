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
  await page.clock.runFor(2500);
  await page.getByRole('button', { name: /붕어빵 꺼내기/ }).click();
  await expect(page.getByRole('list', { name: '거치대 (1/3)' })).toBeVisible();

  // 손님이 오면 주문 카드가 보인다. 거치대의 붕어빵은 끌어서 휴지통에 놓으면 버려진다.
  await expect(page.getByRole('button', { name: /개 주문/ }).first()).toBeVisible();
  await page
    .getByRole('button', { name: /고르기$/ })
    .dragTo(page.getByRole('button', { name: '고른 붕어빵 버리기' }));
  await expect(page.getByRole('list', { name: '거치대 (0/3)' })).toBeVisible();

  // 눌러서 고른 뒤 휴지통을 눌러도 버려진다.
  await page.getByRole('button', { name: /붕어빵 굽는 중|반죽 붓기/ }).first().click();
  await page.clock.runFor(3000);
  await page.getByRole('button', { name: /붕어빵 꺼내기/ }).first().click();
  const fish = page.getByRole('button', { name: /고르기$/ });
  await fish.click();
  await expect(fish).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '고른 붕어빵 버리기' }).click();
  await expect(page.getByRole('list', { name: '거치대 (0/3)' })).toBeVisible();

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

test('a newcomer finishes the tutorial with keyboard shortcuts', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  await page.getByRole('button', { name: /튜토리얼부터/ }).click();
  const coach = page.getByRole('list', { name: '튜토리얼 단계' });
  await expect(coach.locator('[aria-current="step"]')).toContainText('팥 반죽');

  await page.keyboard.press('q'); // 1번 틀에 팥
  await page.clock.runFor(3000);
  await page.keyboard.press('q'); // 꺼내기
  await page.keyboard.press('a'); // 팥 손님에게
  await expect(coach.locator('[aria-current="step"]')).toContainText('슈크림');

  await page.keyboard.press('2'); // 슈크림
  await page.keyboard.press('w');
  await page.clock.runFor(3000);
  await page.keyboard.press('w');
  await page.keyboard.press('a'); // 이제 첫 손님이 슈크림 손님
  await expect(page.getByText('튜토리얼 완료!')).toBeVisible();
  await expect(page.getByRole('button', { name: /튜토리얼 다시 보기/ })).toBeVisible();
});

test('drags a fish onto the customer who ordered it, and leaves the tutorial', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  await page.getByRole('button', { name: /튜토리얼부터/ }).click();
  await page.keyboard.press('q');
  await page.clock.runFor(3000);
  await page.keyboard.press('q');

  // 키보드: Z로 거치대를 고르고, Esc는 고른 것만 풀며(튜토리얼은 그대로), →로 다시 고른다.
  const fish = page.getByRole('button', { name: /팥 .* 고르기$/ });
  await page.keyboard.press('z');
  await expect(fish).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await expect(fish).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('list', { name: '튜토리얼 단계' })).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(fish).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('s'); // 두 번째 손님(슈크림)에게 → 돌려받음
  await expect(page.getByRole('status')).toHaveText('주문한 소가 아니에요');
  await expect(fish).toHaveAttribute('aria-pressed', 'false');

  // 슈크림 손님에게 팥을 끌어 놓으면 돌려받고, 팥 손님에게 놓으면 건네진다.
  await fish.dragTo(page.getByRole('button', { name: /^슈크림 1개 주문/ }));
  await expect(page.getByRole('status')).toHaveText('주문한 소가 아니에요');
  await fish.dragTo(page.getByRole('button', { name: /^팥 1개 주문/ }));
  await expect(page.getByRole('status')).toContainText('완벽');
  await expect(page.getByRole('button', { name: /^팥 1개 주문/ })).toHaveCount(0);

  await page.getByRole('button', { name: '나가기' }).click();
  await expect(page.getByRole('button', { name: /튜토리얼부터/ })).toBeVisible();
});
