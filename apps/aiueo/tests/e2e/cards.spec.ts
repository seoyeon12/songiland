import { expect, test, type Page } from '@playwright/test';

function card(page: Page) {
  return page.locator('.card');
}

test('opens a character card from the chart and returns with back', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-kana-id="hiragana-ka"] button').click();
  await expect(page).toHaveURL(/\/cards\/seion\?at=hiragana-ka&reveal=1$/);
  await expect(card(page)).toContainText('ka');
  await expect(page.getByText('6 / 46')).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('table', { name: '히라가나 청음 오십음도' })).toBeVisible();
});

test('flips, swipes to the next card and keeps the place on reload', async ({ page }) => {
  await page.goto('/cards/row-ka');
  await expect(card(page)).toHaveText('か');
  await card(page).click();
  await expect(card(page)).toContainText('ka');

  const box = await card(page).boundingBox();
  if (!box) {
    throw new Error('카드가 보이지 않습니다.');
  }
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width * 0.8, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.2, y, { steps: 5 });
  await page.mouse.up();
  await expect(card(page)).toHaveText('き');
  await expect(page).toHaveURL(/at=hiragana-ki/);

  await page.reload();
  await expect(card(page)).toHaveText('き');
  await expect(page.getByText('2 / 5')).toBeVisible();
});

test('keeps bookmarks after reload and studies only them', async ({ page }) => {
  await page.goto('/cards/row-ma');
  const bookmark = page.getByRole('button', { name: '내 문자에 담기' });
  await page.getByRole('button', { name: '다음 카드' }).click();
  await page.getByRole('button', { name: '다음 카드' }).click();
  await bookmark.click(); // む
  await expect(bookmark).toHaveAttribute('aria-pressed', 'true');

  await page.goto('/mine');
  await expect(page.getByRole('link', { name: '내 문자 1자' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('list', { name: '담은 문자' })).toContainText('む');
  await expect(page.locator('[data-kana-id="hiragana-mu"]')).toHaveCount(0);

  await page.getByRole('button', { name: '카드로 보기' }).click();
  await expect(page).toHaveURL(/\/cards\/mine$/);
  await expect(card(page)).toHaveText('む');
  await expect(page.getByText('1 / 1')).toBeVisible();
});

test('marks bookmarked characters on the chart', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() =>
    localStorage.setItem(
      'songiland:aiueo:v1',
      JSON.stringify({ version: 1, bookmarks: ['hiragana-shi'] }),
    ),
  );
  await page.reload();
  await expect(page.locator('[data-kana-id="hiragana-shi"] .chart__mark')).toBeVisible();
  await expect(page.locator('[data-kana-id="hiragana-sa"] .chart__mark')).toHaveCount(0);
});
