import { expect, test } from '@playwright/test';

test('ページを開くと、タイトルが表示される', async ({ page }) => {
  // When
  await page.goto('./');

  // Then
  await expect(page).toHaveTitle('レーストラック');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'レーストラック'
  );
  // 設定画面だけが表示され、レース画面は隠れていること
  // (`.race-screen` に `display: flex` 等をつける際、`[hidden]` との詳細度が
  // 同じだと後勝ちで表示されたままになるバグが過去にあったため、明示的に確認する)
  await expect(page.locator('.settings-screen')).toBeVisible();
  await expect(page.locator('.race-screen')).toBeHidden();
});
