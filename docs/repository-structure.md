# リポジトリ構造定義書 (Repository Structure Document)

このドキュメントは、`docs/architecture.md` で決めた層(UI・アプリケーション・ドメイン)と技術構成(Vite・Vitest・Playwright・ビルド時の表の生成)を、具体的なディレクトリとファイルの配置に落とし込む。

## プロジェクト構造

```
race-track/
├── index.html                 # Vite の入口となるHTML(アプリの土台)
├── src/                       # ソースコード
│   ├── main.ts                # 起動処理: 各層を組み立ててアプリを開始する
│   ├── domain/                # ドメイン層: ルール・コースの判定・最短手数の表・CPU
│   │   ├── course/            #   コースの組み立てと内外判定・ゴール判定
│   │   ├── rules/             #   候補の分類・行動の適用・勝敗
│   │   ├── table/             #   最短手数の表(生成・読み書き)
│   │   └── cpu/               #   CPUの手の選択・乱数
│   ├── courses/               # コース定義(3コースのデータ)
│   ├── app/                   # アプリケーション層: 画面の流れ・手番の進行
│   └── ui/                    # UI層: 画面・盤(SVG)・入力
│       ├── board/             #   盤の描画
│       ├── panel/             #   操作パネル(手番表示・方向パッド・ボタン)
│       ├── screens/           #   設定画面・結果画面
│       ├── dialogs/           #   確認・メッセージ・ルール説明のダイアログ
│       └── styles/            #   CSS
├── scripts/                   # 開発用スクリプト
│   ├── generate-tables.ts     # 最短手数の表をビルド前に生成する
│   └── check-dist-size.ts     # ビルド結果の配信サイズを確認する
├── public/                    # そのまま配信するファイル
│   └── tables/                # 生成された表(gzip圧縮済み、Git管理外)
├── tests/                     # テストコード
│   ├── unit/                  # ユニットテスト(src と同じ構造)
│   ├── courses/               # コースの自動チェック
│   ├── sim/                   # CPU同士の対戦シミュレーション
│   └── e2e/                   # E2Eテスト(Playwright)
├── docs/                      # 永続ドキュメント
├── .steering/                 # 作業単位のドキュメント
├── .claude/                   # Claude Code の設定
├── .devcontainer/             # 開発コンテナの設定
├── .husky/                    # コミット前チェック
├── .github/                   # GitHub Actions(CI)
├── vite.config.ts             # Vite の設定
├── vitest.config.ts           # Vitest の設定(ユニットテスト・コースの自動チェック)
├── vitest.sim.config.ts       # Vitest の設定(シミュレーション)
├── playwright.config.ts       # Playwright の設定
├── eslint.config.js           # ESLint の設定(層の依存ルールを含む)
├── .prettierrc                # Prettier の設定
├── tsconfig.json              # TypeScript の設定
├── package.json
├── README.md
└── LICENSE
```

ビルドの出力 `dist/` は Git で管理しない。`dist/` の中身を zip にして itch.io にアップロードする(`architecture.md` のデプロイ)。

## ディレクトリ詳細

### src/ (ソースコードディレクトリ)

#### main.ts

**役割**: アプリの起動。UI層の `DomGameView` と、アプリケーション層の `GameController` を作って結びつけ、設定画面を表示する。

- 各層を組み立てるのはこのファイルだけ。ここ以外で層をまたいだ組み立てをしない

#### domain/

**役割**: ドメイン層。ルール、コースの判定、最短手数の表、CPUの手の選択。画面にもブラウザにも依存しない純粋な計算で、ブラウザ・Node.js(テスト、表の生成)の両方で動く。

**配置ファイル**:
- `types.ts`: ドメイン全体で使う型(`Point`・`Vec`・`Segment`・`GameState`・`PlayerState`・`Action`・`Candidate`・`GameResult`・`GameSettings` など。機能設計書のデータモデル)
- `vec.ts`: 座標の計算(足し算・引き算・比較など)
- `errors.ts`: ドメインのエラー(`CourseDefinitionError`・`RuleViolationError` など)
- `course/`: コースの組み立てと判定
- `rules/`: ルールの判定と行動の適用
- `table/`: 最短手数の表
- `cpu/`: CPUの手の選択と乱数

**命名規則**:
- 関数を公開するファイルは camelCase(例: `buildCourse.ts`、`listCandidates.ts`)
- 型だけのファイルは `types.ts`

**依存関係**:
- 依存可能: `domain/` の中だけ
- 依存禁止: `app/`・`ui/`・`courses/`・DOM・`window`・`document`・タイマー・`Math.random`(ESLint で強制する)

**例**:
```
domain/
├── types.ts
├── vec.ts
├── errors.ts
├── course/
│   ├── types.ts               # CourseDefinition・Course・PathElement・GoalCrossing
│   ├── constants.ts           # EPSILON・MIN_SEGMENT_LENGTH
│   ├── validateCourseDefinition.ts # 定義の制約の検証
│   ├── buildCourse.ts         # 定義からパス・スタートライン・ゴールライン・スタート位置を組み立てる
│   ├── buildPath.ts           # 折れ線の角にフィレット(円弧)を入れてパスを作る
│   ├── pathSampling.ts        # パスの長さ、パスをたどった位置の点
│   ├── shape.ts               # 内外判定に使う形(パスと端の切り落とし)
│   ├── distance.ts            # 点からパスまでの距離、端の切り落とし
│   ├── segmentInside.ts       # 線分の内外判定(距離による省略と二分割)
│   └── goalCrossing.ts        # ゴールラインの到達・通過の判定
├── rules/
│   ├── classify.ts            # 加速9通りの並び、1つの行き先の分類(listCandidates・applyAction・willBeDeadEnd で共通)
│   ├── createGame.ts          # 設定から初期状態を作る
│   ├── listStartPoints.ts     # 置けるスタート位置
│   ├── listCandidates.ts      # 9候補の分類
│   ├── applyAction.ts         # 行動の検証と適用(手番・周回・ゴール)
│   ├── judge.ts               # 決着の判定(周回の終わりのゴール・同着ルール、手番の開始時の行き止まり settleDeadEnd)
│   └── willBeDeadEnd.ts       # 次の手番で行き止まりになるかの予告
├── table/
│   ├── types.ts               # DistanceTable インターフェース
│   ├── speedRange.ts          # 盤の大きさから速度の範囲を求める
│   ├── stateIndex.ts          # 状態(位置×速度)と、表の添字の相互変換
│   ├── buildDistanceTable.ts  # 後ろ向き幅優先探索
│   └── tableCodec.ts          # 表とバイナリの相互変換(gzip の圧縮・展開は呼び出し側が行う)
└── cpu/
    ├── random.ts              # Random インターフェースと、種を固定できる疑似乱数
    ├── cpuLevels.ts           # 強さごとの「わざと損する確率」と「損の上限」
    ├── chooseMove.ts          # 手の選択
    └── chooseStartPoint.ts    # スタート位置の選択
```

#### courses/

**役割**: 3コースの定義データ(`CourseDefinition`)。

**配置ファイル**:
- `[コースID].ts`: 1コースの定義
- `index.ts`: 全コースの一覧と、ID からコース定義を引く関数

**命名規則**:
- ファイル名はコースID(`hairpin.ts`・`crank.ts`・`spiral.ts`)

**依存関係**:
- 依存可能: `domain/` の型(`CourseDefinition` など)
- 依存禁止: `app/`・`ui/`

**例**:
```
courses/
├── index.ts
├── hairpin.ts
├── crank.ts
└── spiral.ts
```

#### app/

**役割**: アプリケーション層。画面の流れ、手番の進行、CPUの「考え中」やアニメーションの待ち合わせ、表の読み込み、P1の「1手戻す」の履歴。

**配置ファイル**:
- `GameController.ts`: 機能設計書の `GameController`
- `GameView.ts`: UI層が実装する `GameView` インターフェース(アプリケーション層が必要とする画面の操作を、ここで定める)
- `loadTable.ts`: 表のファイルを相対パスで読み込み、`DecompressionStream('gzip')` で展開し、サイズを検証して `DistanceTable` にする
- `history.ts`: P1の「1手戻す」の履歴
- `messages.ts`: 画面に出す文言(機能設計書の「メッセージ」)をまとめたもの
- 本番用の `Random`(`Math.random` をそのまま使う実装)は `GameController.ts` に置く。`domain/cpu/random.ts` は `Random` インターフェースと、テスト・シミュレーション用の疑似乱数だけを持ち、`Math.random` を呼ばない(ESLint がドメイン層での使用を禁止しているため)

**命名規則**:
- クラスとインターフェースのファイルは PascalCase(例: `GameController.ts`)
- 関数や定数のファイルは camelCase(例: `loadTable.ts`、`messages.ts`)

**依存関係**:
- 依存可能: `domain/`・`courses/`
- 依存禁止: `ui/`(UI層は `GameView` インターフェースを通してだけ扱う)

#### ui/

**役割**: UI層。`GameView` の実装、画面と盤(SVG)の描画、入力の受付、プレビューと確定の2段階の管理。

**配置ファイル**:
- `DomGameView.ts`: `GameView` の実装。下の部品を組み合わせる
- `board/`: 盤の描画
- `panel/`: 操作パネル
- `screens/`: 設定画面・結果画面
- `dialogs/`: 確認・メッセージ・ルール説明
- `styles/`: CSS

**命名規則**:
- 画面の部品(クラス)のファイルは PascalCase(例: `BoardView.ts`、`DirectionPad.ts`)
- CSS は kebab-case(例: `board.css`、`theme.css`)

**依存関係**:
- 依存可能: `app/`(`GameView` インターフェースと `GameController` の公開メソッド)、`domain/` の型と純粋関数
- 依存禁止: ゲームの状態を直接書き換えること(状態の変更は `GameController` を通す)

**例**:
```
ui/
├── DomGameView.ts
├── board/
│   ├── BoardView.ts           # SVG全体の管理と、変わらない層・変わる層の分離
│   ├── constants.ts           # 盤の余白、座標の表示用変換、パスのSVG化、アニメーション等の時間
│   ├── staticLayer.ts         # 芝・方眼・コース・スタートライン・ゴールライン
│   ├── trailLayer.ts          # 軌跡と車
│   ├── candidateLayer.ts      # 慣性点・9候補・プレビュー
│   └── boardInput.ts          # クリック・タップの2段階の確定
├── panel/
│   ├── ControlPanel.ts        # 手番・周回・メッセージ・ボタン
│   └── DirectionPad.ts        # 3×3の方向パッド
├── screens/
│   ├── SettingsScreen.ts
│   └── ResultScreen.ts
├── dialogs/
│   ├── ConfirmDialog.ts
│   ├── MessageDialog.ts
│   └── RulesDialog.ts
└── styles/
    ├── theme.css              # 色のCSS変数(P1のダークモードもここ)
    ├── layout.css             # PC(横並び)とスマホ(縦並び)の切り替え
    ├── board.css
    └── panel.css
```

### scripts/ (スクリプトディレクトリ)

**役割**: 開発時にだけ使うスクリプト。

**配置ファイル**:
- `generate-tables.ts`: `courses/` の各コースについて `domain/table/buildDistanceTable` で表を作り、gzip で圧縮して `public/tables/[コースID].bin.gz` に書き出す。コースごとの生成時間も表示する。`npm run build`・`npm run dev` の前に自動で実行される(`prebuild`・`predev`)
- `check-dist-size.ts`: `dist/` の合計サイズを計算し、上限(`architecture.md` の「リソース使用量」)を超えたら失敗する。CIの build ジョブで実行する(`npm run check:size`)

**依存関係**:
- 依存可能: `domain/`・`courses/`
- 依存禁止: `app/`・`ui/`

### public/ (そのまま配信するファイル)

**役割**: Vite がビルド時に加工せず `dist/` にコピーするファイル。

**配置ファイル**:
- `tables/[コースID].bin.gz`: `scripts/generate-tables.ts` が生成する最短手数の表(gzip圧縮済み)。**Git で管理しない**(毎回のビルドで作り直す)

### tests/ (テストディレクトリ)

テストは `src/` と分けて置く。実行するコマンドは次のとおり(`test:sim`・`test:e2e` は、`architecture.md` の「現在のリポジトリ設定からの変更点」で `package.json` に追加する)。

| コマンド | 実行するテスト |
|----------|----------------|
| `npm test` | `tests/unit/`・`tests/courses/` |
| `npm run test:sim` | `tests/sim/`(時間がかかるため別コマンド) |
| `npm run test:e2e` | `tests/e2e/`(ビルドしてから Playwright で実行) |

#### unit/

**役割**: ドメイン層を中心としたユニットテスト。

**構造**:
```
tests/unit/
├── fixtures/                  # テスト用の小さなコース、状態を作る補助関数
└── domain/                    # src/domain と同じ構造
    ├── course/
    │   ├── segmentInside.test.ts
    │   └── goalCrossing.test.ts
    ├── rules/
    │   ├── listCandidates.test.ts
    │   └── judge.test.ts
    ├── table/
    │   └── buildDistanceTable.test.ts
    └── cpu/
        └── chooseMove.test.ts
```

**命名規則**:
- パターン: `[テスト対象のファイル名].test.ts`
- 例: `listCandidates.ts` → `listCandidates.test.ts`
- テスト用の小さなコースなど、複数のテストで使う材料は `tests/unit/fixtures/` に置く

#### courses/

**役割**: 3コースの自動チェック(芝の幅、全スタート位置の最短手数、盤に収まること、速度の範囲)。

**構造**:
```
tests/courses/
└── courses.test.ts            # 全コースに同じチェックを行う
```

#### sim/

**役割**: CPU同士の対戦シミュレーション(条件は PRD の KPI「CPUの行き詰まりゼロ」)。

**構造**:
```
tests/sim/
└── cpuRaces.sim.test.ts
```

**命名規則**:
- パターン: `[シナリオ].sim.test.ts`。`npm test`(`vitest.config.ts`)では除外し、`npm run test:sim`(`vitest.sim.config.ts`)でだけ実行する

#### e2e/

**役割**: ビルドした `dist/` を使ったE2Eテスト(Playwright)。

**構造**:
```
tests/e2e/
├── cpu-race.spec.ts           # CPU戦の一連の流れ
├── human-race.spec.ts         # 人同士の一連の流れ
├── mobile.spec.ts             # スマホ幅360pxの表示と方向パッド
└── back-to-settings.spec.ts   # 設定に戻る確認
```

**命名規則**:
- パターン: `[シナリオ].spec.ts`(kebab-case)。拡張子を `.spec.ts` にして Vitest のテストと区別し、Vitest の対象から `tests/e2e/` を除外する

### docs/ (ドキュメントディレクトリ)

**配置ドキュメント**:
- `ideas/`: 壁打ち・アイデアメモ(`initial-requirements.md`)
- `product-requirements.md`: プロダクト要求定義書
- `functional-design.md`: 機能設計書
- `architecture.md`: アーキテクチャ設計書
- `repository-structure.md`: リポジトリ構造定義書(本ドキュメント)
- `development-guidelines.md`: 開発ガイドライン
- `glossary.md`: 用語集

## ファイル配置規則

### ソースファイル

| ファイル種別 | 配置先 | 命名規則 | 例 |
|------------|--------|---------|-----|
| ドメインの型 | `src/domain/`(分野ごとの型は各サブディレクトリ) | `types.ts` | `domain/types.ts`、`domain/course/types.ts` |
| ドメインの関数 | `src/domain/[分野]/` | camelCase(公開する主な関数名と同じ) | `listCandidates.ts` |
| コース定義 | `src/courses/` | コースID | `hairpin.ts` |
| アプリケーション層のクラス | `src/app/` | PascalCase | `GameController.ts` |
| UIの部品(クラス) | `src/ui/[種類]/` | PascalCase | `DirectionPad.ts` |
| UIの描画関数 | `src/ui/[種類]/` | camelCase | `staticLayer.ts` |
| CSS | `src/ui/styles/` | kebab-case | `theme.css` |
| 開発用スクリプト | `scripts/` | kebab-case | `generate-tables.ts` |

### テストファイル

| テスト種別 | 配置先 | 命名規則 | 例 |
|-----------|--------|---------|-----|
| ユニットテスト | `tests/unit/`(src と同じ構造) | `[対象].test.ts` | `listCandidates.test.ts` |
| コースの自動チェック | `tests/courses/` | `[対象].test.ts` | `courses.test.ts` |
| シミュレーション | `tests/sim/` | `[シナリオ].sim.test.ts` | `cpuRaces.sim.test.ts` |
| E2Eテスト | `tests/e2e/` | `[シナリオ].spec.ts` | `cpu-race.spec.ts` |

### 設定ファイル

| ファイル種別 | 配置先 | 命名規則 |
|------------|--------|---------|
| ツールの設定 | プロジェクトルート | `[ツール名].config.ts`(既存の `eslint.config.js` と `.prettierrc` はそのままの名前で使う) |
| TypeScript の設定 | プロジェクトルート | `tsconfig.json` |
| 定数(CPUの強さ、盤の大きさなど) | それを使うドメインの分野のディレクトリ | camelCase(例: `cpuLevels.ts`) |

- 環境ごとの設定ファイル(開発・本番など)は作らない。最初の版には切り替える設定がないため

## 命名規則

### ディレクトリ名

- **層のディレクトリ**: 単数形、小文字(`domain/`・`app/`・`ui/`)
- **分野・種類のディレクトリ**: 単数形、kebab-case(`course/`・`rules/`・`board/`)。ただし、同じ種類のものを並べる入れ物は複数形(`courses/`・`screens/`・`dialogs/`・`styles/`・`tables/`)

### ファイル名

- **クラス・インターフェースのファイル**: PascalCase(例: `GameController.ts`、`GameView.ts`)
- **関数のファイル**: camelCase(例: `buildCourse.ts`、`applyAction.ts`)
- **型だけのファイル**: `types.ts`
- **定数のファイル**: camelCase(例: `cpuLevels.ts`、`messages.ts`)。中の定数名は UPPER_SNAKE_CASE
- **CSS・スクリプト・E2Eテスト**: kebab-case

### テストファイル名

- ユニットテスト・コースのチェック: `[テスト対象].test.ts`
- シミュレーション: `[シナリオ].sim.test.ts`
- E2Eテスト: `[シナリオ].spec.ts`

## 依存関係のルール

### 層の間の依存

```
main.ts(組み立て)
    ↓
ui/ ──→ app/ ──→ domain/
 │        │         ↑
 │        └──→ courses/ ──┘
 └──────────────→ domain/(型と純粋関数)

scripts/ ──→ courses/・domain/
tests/   ──→ 各層(テスト対象)
```

**禁止される依存**:
- `domain/` → `app/`・`ui/`・`courses/` (❌)
- `app/` → `ui/` (❌。`GameView` インターフェースを通す)
- `courses/` → `app/`・`ui/` (❌)
- `scripts/` → `app/`・`ui/` (❌)

**強制の方法**: ESLint の `no-restricted-imports` を、ディレクトリごとの設定として `eslint.config.js` に書く(`architecture.md` の「層のルールの強制」)。

### モジュール間の依存

- 循環依存を禁止する。2つのファイルが互いの型を必要とする場合は、型を `types.ts` に移す
- `domain/` の各分野(`course/`・`rules/`・`table/`・`cpu/`)の依存は、次の向きだけにする

```
cpu/ ──→ table/ ──→ rules/ ──→ course/
  └──────────────────↑
```

- `table/` は `rules/` の `classifyMove`・`ACCELS_IN_ORDER`(候補の分類)を再利用する。ゴールの判定だけが必要なところ(最短手数の表の生成)は、判定の重複を避けるため `classifyMove` を経由せず `course.goalCrossing` を直接呼ぶ(`docs/functional-design.md`「アルゴリズム設計 > 4」の「同じ Course の判定を使う」を、候補の分類そのものの再利用にまで広げた)
- `rules/` は `table/` に依存しない(逆方向の依存は作らない)。P1の「危ない手」の判定は、`rules/listCandidates` が表を引数で受け取れるようにし、表の型だけを参照する

## スケーリング戦略

### 機能の追加

| 将来の機能 | 追加する場所 |
|-----------|-------------|
| P1: 行き止まりのアラート | `domain/rules/listCandidates.ts`(`dangerous` の判定)、`ui/board/candidateLayer.ts`、`ui/dialogs/ConfirmDialog.ts` |
| P1: 1手戻す | `app/history.ts`、`ui/panel/ControlPanel.ts` |
| P1: キーボード操作 | `ui/keyboardInput.ts` を追加 |
| P1: ダークモード | `ui/styles/theme.css` |
| P1: 軌跡の手数番号 | `ui/board/trailLayer.ts` |
| P1: 拡大表示(スマホ向け) | `ui/board/BoardView.ts`(`viewBox` の追従) |
| P2: コースの追加 | `courses/` にファイルを足し、`courses/index.ts` に登録する |
| P2: 3台以上のレース | `domain/rules/judge.ts` の決着の判定を拡張する |
| P2: オンライン対戦 | `src/online/` を新しく作り、同期サービスとの接続を置く。`app/` から入力元の1つとして使う |
| P2: ランダム生成・エディタ | `src/worker/` を新しく作り、`buildDistanceTable` を Web Worker で動かす |

### ファイルサイズの管理

- 1ファイル300行以下を目安とする。300行を超えたら分割を検討し、500行を超えたら分割する
- 特に `GameController.ts` は大きくなりやすいので、画面ごとの処理が増えたら、画面の段階(スタート位置選び・レース・結果)ごとにファイルを分ける

## 特殊ディレクトリ

### .steering/ (ステアリングファイル)

**役割**: 特定の開発作業における「今回何をするか」を定義する。

**構造**:
```
.steering/
└── [YYYYMMDD]-[task-name]/
    ├── requirements.md      # 今回の作業の要求内容
    ├── design.md            # 変更内容の設計
    └── tasklist.md          # タスクリスト
```

**命名規則**: `20260927-add-course-geometry` 形式

- 中身は Git で管理しない(`.gitkeep` だけを管理する。既存の `.gitignore` の設定)

### .github/ (GitHub Actions)

**役割**: CIの設定(`development-guidelines.md` の「CI」)。

**構造**:
```
.github/
└── workflows/
    └── ci.yml               # check・build・e2e・sim のジョブ
```

- ジョブは1つのファイルにまとめ、ジョブごとに実行する条件(すべての push、`main` への push だけ、特定のディレクトリの変更だけ)を設定する

### .claude/ (Claude Code の設定)

**役割**: Claude Code の設定とカスタマイズ。

**構造**:
```
.claude/
├── commands/                # スラッシュコマンド
├── skills/                  # 作業の種類ごとのスキル
├── agents/                  # サブエージェントの定義
└── settings.json            # 共有の設定(settings.local.json は Git 管理外)
```

## 除外設定

### .gitignore

既存の設定に加えて、次を除外する。

| 対象 | 理由 |
|------|------|
| `public/tables/` | ビルドのたびに生成する表(`*.bin.gz`) |
| `test-results/`・`playwright-report/` | Playwright の出力 |

既存の設定で除外済みのもの: `node_modules/`・`dist/`・`coverage/`・`.env`・`*.log`・`.steering/` の中身・`.claude/settings.local.json` など。

### .prettierignore・ESLint の除外

次をツールの対象から外す。

- `dist/`・`node_modules/`・`coverage/`・`.steering/`
- `public/tables/`(バイナリの生成物)
- `test-results/`・`playwright-report/`
