# レーストラック(ブラウザ版)

『マーチン・ガードナーの数学ゲームⅡ 新装版』(別冊日経サイエンス182)の第17話「シムとチョンプとレーストラック」で紹介された、紙と鉛筆のゲーム「レーストラック」を、ブラウザで遊べるようにするプロジェクトです。

方眼紙の上の車を、「前の手と同じだけ進んだ点」のまわり9点から選んで動かし、先にゴールした方が勝ち。サイコロを使わず、慣性だけで勝負が決まります。CPUとの1対1、または1台の端末で人同士の対戦ができます(開発中)。

## ドキュメント

| ドキュメント | 内容 |
|------------|------|
| [プロダクト要求定義書](docs/product-requirements.md) | 何を作るか(ゲームのルールの正式な定義を含む) |
| [機能設計書](docs/functional-design.md) | どう動くか |
| [技術仕様書](docs/architecture.md) | 何で作るか |
| [リポジトリ構造定義書](docs/repository-structure.md) | どこに置くか |
| [開発ガイドライン](docs/development-guidelines.md) | どう書くか・どう進めるか |
| [用語集](docs/glossary.md) | 言葉の意味 |

## 開発環境

Dev Container で開発します(事前に Docker と VS Code の Dev Containers 拡張が必要です)。

```bash
# 1. リポジトリを取得して、VS Code の「Reopen in Container」で開く
git clone https://github.com/nogawa-asase/race-track.git
cd race-track

# 2. 依存を入れる(Dev Container の作成時に自動で実行されます)
npm install

# 3. E2Eテスト用のブラウザを入れる(初回だけ)
npx playwright install --with-deps chromium webkit

# 4. 開発サーバーを起動する
npm run dev
```

## コマンド

| コマンド | 内容 |
|---------|------|
| `npm run dev` | 開発サーバーを起動する |
| `npm run build` | 型チェックのうえ、`dist/` に配信用のファイルを出力する |
| `npm run preview` | ビルドした `dist/` を配信して確認する |
| `npm run check:size` | `dist/` の合計サイズが上限(500KB)以内かを確かめる |
| `npm run lint` | ESLint(層の依存ルールを含む) |
| `npm run typecheck` | 型チェック |
| `npm run format` | Prettier で整形する |
| `npm test` | ユニットテスト・コースの自動チェック |
| `npm run test:coverage` | ユニットテストとカバレッジ(ドメイン層) |
| `npm run test:sim` | CPU同士の対戦シミュレーション |
| `npm run test:e2e` | ビルドして、Chromium と WebKit で E2E テストを実行する |

## 公開

itch.io で公開する予定です。手順は [技術仕様書の「デプロイ(itch.io)」](docs/architecture.md) と [開発ガイドラインの「リリース」](docs/development-guidelines.md) を参照してください。

## ライセンス

[MIT](LICENSE)

このリポジトリは、技術評論社「実践Claude Code入門 - 現場で活用するためのAIコーディングの思考法」のサンプルリポジトリ(https://github.com/GenerativeAgents/claude-code-book)をテンプレートとして作成しました。
