import { expect, test } from '@playwright/test';

test('ページを開くと、タイトルが表示される', async ({ page }) => {
  // When
  await page.goto('./');

  // Then
  await expect(page).toHaveTitle('レーストラック');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'レーストラック'
  );
});
