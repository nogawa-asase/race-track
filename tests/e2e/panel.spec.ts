import { expect, test } from '@playwright/test';

/**
 * 設定画面からスタートし、くじのメッセージを閉じてレース画面まで進める。
 * デフォルト設定(CPU戦・くじ)を使う
 */
async function startGame(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('./');
  await page.waitForSelector('.settings-screen');
  await page.click('.settings-screen button:has-text("スタート")');
  await page.waitForSelector('.message-dialog[open]');
  await page.click('.message-dialog button:has-text("OK")');
  await page.waitForSelector('.race-screen:not([hidden])');
}

test.describe('レイアウトの切り替え', () => {
  test('幅768px以上・横向き(PC)でも、スマホと同じく盤の下に操作パネルが並ぶ', async ({
    page,
  }) => {
    // Given
    await page.setViewportSize({ width: 1000, height: 700 });

    // When
    await startGame(page);

    // Then
    const flexDirection = await page
      .locator('.race-screen')
      .evaluate((el) => getComputedStyle(el).flexDirection);
    expect(flexDirection).toBe('column');
  });

  test('幅360px(スマホ)では、縦並びになり、横スクロールなしで表示される', async ({
    page,
  }) => {
    // Given
    await page.setViewportSize({ width: 360, height: 800 });

    // When
    await startGame(page);

    // Then
    const flexDirection = await page
      .locator('.race-screen')
      .evaluate((el) => getComputedStyle(el).flexDirection);
    expect(flexDirection).toBe('column');
    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth
    );
    expect(scrollWidth).toBeLessThanOrEqual(360);

    // オートズームはスマホ専用の機能のため、ボタンが表示される
    // (PC側の非表示は game-flow.spec.ts の「盤のカメラ」で確認する)
    await expect(
      page.locator('.panel-buttons button:has-text("オートズーム")')
    ).toBeVisible();

    // 4つのボタンは常に1行に収まり(flex: 1 1 0 で均等に縮む)、
    // 盤の幅をはみ出さない
    const [retireRight, boardRight] = await Promise.all([
      page
        .locator('.retire-button')
        .evaluate((el) => el.getBoundingClientRect().right),
      page.locator('.board').evaluate((el) => el.getBoundingClientRect().right),
    ]);
    expect(retireRight).toBeLessThanOrEqual(boardRight + 0.5);
  });
});
