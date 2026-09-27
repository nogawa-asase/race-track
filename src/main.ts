/**
 * アプリの起動処理。
 *
 * 画面の実装までは、タイトルだけを表示する(ビルドと E2E テストの確認用)。
 */
const app = document.querySelector<HTMLDivElement>('#app');
if (!app) {
  throw new Error('#app が見つかりません');
}

const title = document.createElement('h1');
title.textContent = 'レーストラック';
app.append(title);
