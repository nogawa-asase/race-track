import { expect, test } from '@playwright/test';

test.describe('盤(BoardView)', () => {
  test('9候補が表示される', async ({ page }) => {
    // When
    await page.goto('./');

    // Then
    await expect(page.locator('.board')).toBeVisible();
    await expect(page.locator('[data-accel-x]')).toHaveCount(9);
  });

  test('選べる候補・ゴールできる候補・はみ出す候補・相手がいる候補が、それぞれ正しく分類される', async ({
    page,
  }) => {
    // Given: デモの初期状態(先攻は位置(6,5)、速度(2,0))で、候補は
    // すべてコースの内側(道は y が 2〜8)。相手は遠くにいるため occupied はない
    await page.goto('./');

    // Then: 9つとも選べる(ok)候補になっている
    await expect(page.locator('.candidate-ok')).toHaveCount(9);
    await expect(page.locator('.candidate-goal')).toHaveCount(0);
    await expect(page.locator('.candidate-offcourse')).toHaveCount(0);
    await expect(page.locator('.candidate-occupied')).toHaveCount(0);
  });

  test('マウスのクリックは1回で確定する', async ({ page }) => {
    // Given
    await page.goto('./');
    const candidate = page.locator('[data-accel-x="1"][data-accel-y="0"]');

    // When
    await candidate.click();

    // Then: 移動が確定し、状態が更新される(選んだ点が表示される)
    await expect(page.locator('#status')).toHaveText('選んだ点: (9, 5)');
  });

  test('タッチは1回目でプレビュー、2回目の同じ候補で確定する', async ({
    page,
  }) => {
    // Given
    await page.goto('./');
    const candidate = page.locator('[data-accel-x="0"][data-accel-y="1"]');
    const target = await candidate.evaluate((el) => ({
      x: Number((el as HTMLElement).dataset.accelX),
      y: Number((el as HTMLElement).dataset.accelY),
    }));
    expect(target).toEqual({ x: 0, y: 1 });

    // When: 1回目のタップ(touch)
    await candidate.dispatchEvent('pointerup', { pointerType: 'touch' });

    // Then: まだ確定していないが、プレビューは表示されている
    await expect(page.locator('#status')).toHaveText('');
    await expect(page.locator('.is-previewed')).toHaveCount(1);

    // When: 同じ候補への2回目のタップ
    await candidate.dispatchEvent('pointerup', { pointerType: 'touch' });

    // Then: 確定する(行き先は (6,5)+(2,1)=(8,6))
    await expect(page.locator('#status')).toHaveText('選んだ点: (8, 6)');
  });

  test('別の候補をタッチすると、プレビューが移る(確定しない)', async ({
    page,
  }) => {
    // Given
    await page.goto('./');
    const first = page.locator('[data-accel-x="0"][data-accel-y="1"]');
    const second = page.locator('[data-accel-x="1"][data-accel-y="1"]');

    // When
    await first.dispatchEvent('pointerup', { pointerType: 'touch' });
    await second.dispatchEvent('pointerup', { pointerType: 'touch' });

    // Then: どちらもまだ確定していない
    await expect(page.locator('#status')).toHaveText('');
  });

  test('幅360pxの画面で、盤が横スクロールなしで表示される', async ({
    page,
  }) => {
    // Given
    await page.setViewportSize({ width: 360, height: 640 });

    // When
    await page.goto('./');

    // Then
    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth
    );
    expect(scrollWidth).toBeLessThanOrEqual(360);
    await expect(page.locator('.board')).toBeVisible();
  });
});

test('選べない候補(相手がいる)をクリックしても、何も起こらない', async ({
  page,
}) => {
  // Given: 相手が (8,5) にいて、先攻の中央の候補と重なる
  await page.goto('./?scenario=occupied');
  const occupied = page.locator('[data-accel-x="0"][data-accel-y="0"]');
  await expect(occupied).toHaveClass(/candidate-occupied/);
  await expect(occupied).toHaveClass(/is-disabled/);

  // When
  await occupied.click({ force: true });

  // Then: 何も選ばれていない
  await expect(page.locator('#status')).toHaveText('');
});
