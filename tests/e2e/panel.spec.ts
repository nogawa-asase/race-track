import { expect, test } from '@playwright/test';

test.describe('操作パネル(ControlPanel)', () => {
  test('方向パッドが、候補の色・記号・有効無効を反映する', async ({ page }) => {
    // Given: デモの初期状態は9候補とも選べる(ok)、手番は赤鉛筆
    await page.goto('./');
    const pad = page.locator('.direction-pad');

    // Then
    await expect(pad.locator('button')).toHaveCount(9);
    await expect(pad.locator('button:not(:disabled)')).toHaveCount(9);
    await expect(pad.locator('button.candidate-ok.color-red')).toHaveCount(9);
    await expect(pad.locator('button', { hasText: '●' })).toHaveCount(9);
  });

  test('相手がいる候補のボタンは無効になる', async ({ page }) => {
    // Given
    await page.goto('./?scenario=occupied');
    const pad = page.locator('.direction-pad');

    // Then
    await expect(pad.locator('button:disabled')).toHaveCount(1);
    await expect(
      pad.locator('button[data-accel-x="0"][data-accel-y="0"]')
    ).toBeDisabled();
  });

  test('1回目の押下でプレビュー、同じボタンの2回目の押下で確定する', async ({
    page,
  }) => {
    // Given
    await page.goto('./');
    const button = page.locator(
      '.direction-pad button[data-accel-x="1"][data-accel-y="0"]'
    );

    // When: 1回目
    await button.click();

    // Then: まだ確定していない
    await expect(page.locator('#status')).toHaveText('');
    await expect(button).toHaveClass(/is-previewed/);

    // When: 2回目(同じボタン)
    await button.click();

    // Then: 確定する(行き先は (6,5)+(2,0)+(1,0)=(9,5))
    await expect(page.locator('#status')).toHaveText('選んだ点: (9, 5)');
  });

  test('別のボタンを押すと、プレビューが移る(確定しない)', async ({ page }) => {
    // Given
    await page.goto('./');
    const first = page.locator(
      '.direction-pad button[data-accel-x="1"][data-accel-y="0"]'
    );
    const second = page.locator(
      '.direction-pad button[data-accel-x="0"][data-accel-y="1"]'
    );

    // When
    await first.click();
    await second.click();

    // Then: どちらも確定していない
    await expect(page.locator('#status')).toHaveText('');
    await expect(second).toHaveClass(/is-previewed/);
    await expect(first).not.toHaveClass(/is-previewed/);
  });

  test('選べない候補のボタンを押しても、何も起こらない', async ({ page }) => {
    // Given
    await page.goto('./?scenario=occupied');
    const button = page.locator(
      '.direction-pad button[data-accel-x="0"][data-accel-y="0"]'
    );

    // When
    await button.click({ force: true });

    // Then
    await expect(page.locator('#status')).toHaveText('');
  });

  test('スタート位置選びのパッド: 初期プレビューは中央、←/→で移動、決定で確定する', async ({
    page,
  }) => {
    // Given
    await page.goto('./?scenario=placing');
    const confirmButton = page.locator('.start-position-pad button', {
      hasText: '決定',
    });
    const initial = await confirmButton.evaluate((el) => ({
      x: (el as HTMLElement).dataset.previewX,
      y: (el as HTMLElement).dataset.previewY,
    }));

    // When: 「→」で1つ隣に移す
    await page.locator('.start-position-pad button', { hasText: '→' }).click();
    const moved = await confirmButton.evaluate((el) => ({
      x: (el as HTMLElement).dataset.previewX,
      y: (el as HTMLElement).dataset.previewY,
    }));

    // Then: プレビューが変わっている
    expect(moved).not.toEqual(initial);

    // When: 決定
    await confirmButton.click();

    // Then
    await expect(page.locator('#status')).toHaveText(
      `選んだ点: (${moved.x}, ${moved.y})`
    );
  });

  test('「設定に戻る」「ルール説明」ボタンでコールバックが呼ばれる', async ({
    page,
  }) => {
    // Given
    await page.goto('./');

    // When
    await page
      .locator('.panel-buttons button', { hasText: '設定に戻る' })
      .click();

    // Then
    await expect(page.locator('#status')).toHaveText('設定に戻る(デモ)');

    // When
    await page
      .locator('.panel-buttons button', { hasText: 'ルール説明' })
      .click();

    // Then
    await expect(page.locator('#status')).toHaveText('ルール説明(デモ)');
  });
});

test.describe('レイアウトの切り替え', () => {
  test('幅768px以上・横向きでは、盤と操作パネルが横並びになる', async ({
    page,
  }) => {
    // Given
    await page.setViewportSize({ width: 1000, height: 700 });

    // When
    await page.goto('./');

    // Then
    const flexDirection = await page
      .locator('.race-screen')
      .evaluate((el) => getComputedStyle(el).flexDirection);
    expect(flexDirection).toBe('row');
  });

  test('幅360px(スマホ)では、縦並びになり、横スクロールなしで表示される', async ({
    page,
  }) => {
    // Given
    await page.setViewportSize({ width: 360, height: 800 });

    // When
    await page.goto('./');

    // Then
    const flexDirection = await page
      .locator('.race-screen')
      .evaluate((el) => getComputedStyle(el).flexDirection);
    expect(flexDirection).toBe('column');
    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth
    );
    expect(scrollWidth).toBeLessThanOrEqual(360);
  });
});
