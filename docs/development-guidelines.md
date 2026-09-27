# 開発ガイドライン (Development Guidelines)

このドキュメントは、`docs/architecture.md` と `docs/repository-structure.md` にもとづいて、コードの書き方と開発の進め方を定める。迷ったときは「ルールの判定をドメイン層の1か所に閉じ込め、テストで確かめる」ことを優先する。

## コーディング規約

### 基本方針

| 方針 | 理由 |
|------|------|
| ドメイン層は純粋な関数で書く | 同じコードを、ブラウザ・テスト・シミュレーション・ビルド時の表の生成で使うため |
| 状態は書き換えずに新しく作る(イミュータブル) | P1の「1手戻す」を、状態を積むだけで実現するため。状態の変更箇所を追いやすくするため |
| 判定は必ずドメイン層に任せる | 画面の判定とCPUの判断がずれないようにするため(UI層やアプリケーション層で判定を書き直さない) |
| 数値の決めごとには名前を付ける | 標本化の間隔、アニメーションの時間、CPUの確率など、調整する値を1か所で管理するため |

### 型定義

- `any` を使わない。型が分からない値は `unknown` で受けて、確かめてから使う
- ドメインの型のプロパティには `readonly` を付け、配列は `readonly T[]` にする
- 取りうる値が決まっている文字列は、文字列リテラルの合併型で表す(`enum` は使わない)

```typescript
// ✅ 良い例
interface PlayerState {
  readonly kind: 'human' | 'cpu';
  readonly position: Vec | null;
  readonly velocity: Vec;
  readonly trail: readonly Vec[];
}

type CandidateStatus = 'ok' | 'goal' | 'offCourse' | 'occupied';

// ❌ 悪い例
interface PlayerState {
  kind: string;        // 取りうる値が分からない
  trail: any[];        // 何の配列か分からない
}
```

- 状態を変えるときは、スプレッド構文で新しいオブジェクトを作る

```typescript
// ✅ 良い例: 新しい状態を返す
function moveCar(player: PlayerState, target: Vec, velocity: Vec): PlayerState {
  return {
    ...player,
    position: target,
    velocity,
    trail: [...player.trail, target],
  };
}

// ❌ 悪い例: 引数の状態を書き換える
function moveCar(player: PlayerState, target: Vec, velocity: Vec): void {
  player.position = target;
  player.trail.push(target);
}
```

- **例外**: 最短手数の表の生成(`buildDistanceTable`)のように、数十万回くり返す処理の内部では、型付き配列(`Uint8Array` など)への書き込みや、ローカル変数の書き換えを認める。関数の外から見て純粋(同じ入力に同じ出力、引数を書き換えない)であればよい

### 命名規則

#### 変数・関数・型

| 対象 | 規則 | 例 |
|------|------|-----|
| 変数・引数 | camelCase、名詞 | `startPoints`、`goalRound` |
| 関数 | camelCase、動詞で始める | `listCandidates`、`applyAction`、`buildCourse` |
| 真偽値 | `is`・`has`・`can`・`will` で始める | `isInside`、`hasGoaled`、`willBeDeadEnd` |
| 定数 | UPPER_SNAKE_CASE | `MIN_SEGMENT_LENGTH`、`THINKING_MS` |
| 型・インターフェース・クラス | PascalCase、名詞。インターフェースに `I` を付けない | `GameState`、`GameView`、`GameController` |

#### このプロジェクトの用語

コード上の名前は英語で書く。用語の定義と、日本語とコード上の名前の対応は `docs/glossary.md` を正とする。

下の表は、実装で取り違えやすい名前だけを抜き出した早見表。意味は用語集を参照する。

| 日本語 | コード上の名前 |
|--------|---------------|
| 位置・速度・加速 | `position`・`velocity`・`accel` |
| 行き先・慣性点 | `target`・`inertiaPoint` |
| 候補 | `candidate` |
| 周回・手番 | `round`・`turn` |
| 手数 | `moveCounts`(1人分は `trail.length - 1`) |
| 行き止まり | `deadEnd` |
| 最短手数 | `distance`(「なし」は `null`) |

- 座標は **x が右向き、y が下向き**(機能設計書の約束)。「上」「下」を表す変数や関数では、y の符号を取り違えないよう、`UP = { x: 0, y: -1 }` のように定数を使う

#### ファイル名

`docs/repository-structure.md` の命名規則に従う(クラスは PascalCase、関数は camelCase、CSS・スクリプト・E2Eテストは kebab-case)。

### コードフォーマット

既存の Prettier の設定(`.prettierrc`)に従う。手で整形しない。

- インデント: 2スペース
- 行の長さ: 80文字
- セミコロンあり、文字列はシングルクォート、末尾カンマは ES5 の範囲

### 関数設計

- 1つの関数は1つのことをする。目安は50行以内
- 引数が4つを超えたら、オブジェクトにまとめる
- ドメイン層の関数は、必要な情報をすべて引数で受け取る(グローバルな状態を読まない)
- 乱数は `Random` インターフェースで受け取る。`Math.random` を直接呼ばない

```typescript
// ✅ 良い例: 乱数を引数で受け取るので、テストで結果を固定できる
function chooseMove(
  state: GameState,
  candidates: readonly Candidate[],
  table: DistanceTable,
  level: CpuLevel,
  random: Random
): Vec { /* ... */ }

// ❌ 悪い例: 結果がテストのたびに変わる
function chooseMove(candidates: Candidate[]): Vec {
  const i = Math.floor(Math.random() * candidates.length);
  return candidates[i].accel;
}
```

### 数値と浮動小数点

- 格子点・速度・加速は整数だけを扱う。整数どうしは `===` で比べてよい
- コースの判定(距離・交点)は浮動小数点の計算になる。境界の判定には、機能設計書の「コースの内外判定」で決めた許容誤差 `EPSILON`(`1e-9`)を使い、数値を直接書かない
- 「縁の上は内側」(機能設計書)を守るため、比較は `d <= halfWidth + EPSILON` のように、内側に倒れる向きで書く
- 調整する値は、名前を付けて1か所にまとめる。PRD・設計書で決めた値を使う定数には、コメントで出典を書く。値を変えるときは、先にドキュメントを直す

```typescript
// ✅ 良い例
export const MIN_SEGMENT_LENGTH = 1 / 16; // 線分の内外判定で、二分割をやめる長さ(目盛り)
export const THINKING_MS = 500;          // CPUの「考え中」の表示時間(PRDの非機能要件)
export const MOVE_ANIMATION_MS = 260;    // 車の移動アニメーションの時間(PRDの非機能要件)

// ❌ 悪い例
if (length <= 0.0625) { /* 0.0625 が何か分からない */ }
setTimeout(next, 500);
```

### コメント規約

- コメントは日本語で書く
- 公開する関数と型には、TSDoc で「何をするか」と、引数・戻り値の意味を書く
- ルールや記事の図にもとづく処理には、根拠(PRD・機能設計書の該当箇所)を書く
- インラインコメントは「なぜそうするか」を書く。コードを読めば分かる「何をしているか」は書かない

```typescript
/**
 * 手番のプレイヤーの9候補を作り、分類する。
 *
 * @param state - 現在のゲームの状態(phase が 'racing' であること)
 * @param course - 判定に使うコース
 * @returns 加速 (-1,-1) 〜 (1,1) の順に並んだ9つの候補
 */
export function listCandidates(state: GameState, course: Course): Candidate[] {
  // ゴールの判定を先に行う。ゴールする手は、ゴールラインの先でコースの外に
  // 出てもよいため(PRD「ゴールと勝敗」)
  // ...
}
```

### エラーハンドリング

**原則**:
- ルールに合わない行動は、ドメイン層が `RuleViolationError` を投げる。状態は変えない
- 予期しないエラーは握りつぶさず、上位(アプリケーション層)に伝える
- アプリケーション層は、機能設計書の「エラーハンドリング」の表に従って、利用者に表示する

```typescript
// domain/errors.ts
export class RuleViolationError extends Error {
  constructor(
    message: string,
    public readonly action: Action
  ) {
    super(message);
    this.name = 'RuleViolationError';
  }
}

// app/GameController.ts
try {
  this.state = applyAction(this.state, this.course, action);
} catch (error) {
  if (error instanceof RuleViolationError) {
    // 画面側で選べない操作は無効化しているので、ここに来たら不具合
    console.error('ルールに合わない行動:', error.action, error.message);
    return;
  }
  throw error; // 想定外のエラーは上位の「エラー画面」に任せる
}

// ❌ 悪い例: エラーを無視する
try {
  this.state = applyAction(this.state, this.course, action);
} catch {
  // 何もしない
}
```

### 非同期処理

- 待ち時間(「考え中」やアニメーション)は `async`/`await` で書き、アプリケーション層にまとめる。ドメイン層は同期的な関数だけにする
- 待っている間に、設定画面に戻る・もう一度などの操作が入ることがある。待ち終わった後に、レースが続いているかを確認してから次の処理に進む

```typescript
// ✅ 良い例: 待った後に、同じレースが続いているかを確かめる
const raceId = this.raceId;
await delay(THINKING_MS);
if (raceId !== this.raceId) return; // 待っている間に設定画面に戻った
```

### UIの実装

- 画面に出す文言は `app/messages.ts` にまとめ、コードの中に直接書かない
- 利用者の入力をHTMLとして挿入しない。文字列は `textContent` で設定する(`innerHTML` を使うのは、固定のテンプレートだけ)
- 色は `ui/styles/theme.css` のCSS変数だけを使う。TypeScript や個別のCSSに色の値を直接書かない
- 候補は色と記号の両方で区別する。方向パッドのボタンには `aria-label`(例: 「左上」「そのまま」)を付ける
- タップする部品は一辺44px以上にする
- アニメーションは `prefers-reduced-motion` を確かめ、有効なら省略する

## テスト

### テストの種類と目標

| 種類 | 対象 | 目標 | コマンド |
|------|------|------|----------|
| ユニットテスト | ドメイン層 | 行・分岐・関数それぞれ80%以上 | `npm test` |
| コースの自動チェック | 3コース | 全項目の合格 | `npm test` |
| シミュレーション | CPU同士の対戦 | PRDのKPI「CPUの行き詰まりゼロ」を満たす | `npm run test:sim` |
| E2Eテスト | 画面の一連の流れ | 機能設計書のシナリオがすべて合格(Chromium と WebKit) | `npm run test:e2e` |

- UI層とアプリケーション層は、E2Eテストで確かめる。ユニットテストのカバレッジ目標は課さない

### テストの書き方

- Given-When-Then の順に書き、コメントで区切る
- テスト名は日本語で、「どういう条件で、どうなるか」を書く

```typescript
describe('listCandidates', () => {
  it('速度0のとき、その場にとどまる候補は選べる', () => {
    // Given: 速度0で直線コースの中央にいる
    const course = buildCourse(straightCourse);
    const state = racingState({ position: { x: 5, y: 5 }, velocity: ZERO });

    // When
    const candidates = listCandidates(state, course);

    // Then
    const stay = candidates.find((c) => c.accel.x === 0 && c.accel.y === 0);
    expect(stay?.status).toBe('ok');
  });

  it('カーブの内側の芝を横切る候補は、はみ出すと判定する', () => {
    // ...
  });
});
```

### テストの材料

- テスト用の小さなコース(直線、L字など)と、状態を作る補助関数は `tests/unit/fixtures/` に置き、使い回す
- 本番の3コースは、コースの自動チェックとシミュレーションでだけ使う。ユニットテストは、手で答えを計算できる小さなコースで書く
- 乱数を使うテストは、種を固定した疑似乱数(`domain/cpu/random.ts`)を使い、結果を再現できるようにする
- ドメイン層はモックを使わない(純粋な関数なので、本物をそのまま使う)

### 不具合を直すとき

- まず不具合を再現するテストを書き、失敗することを確かめてから直す
- シミュレーションで見つかった不具合は、そのときの乱数の種と状態を、ユニットテストに写す

## Git運用ルール

### ブランチ戦略

少人数の開発で、本番環境は itch.io だけなので、Git Flow ではなく、`main` と作業ブランチだけの運用にする。

```
main(いつでもビルド・公開できる状態)
 ├── feature/course-geometry
 ├── feature/cpu-player
 └── fix/goal-line-exact-stop
```

| ブランチ | 用途 | 分岐元 | マージ先 |
|----------|------|--------|----------|
| `main` | 公開できる状態を保つ | — | — |
| `feature/[内容]` | 機能の追加 | `main` | `main` |
| `fix/[内容]` | 不具合の修正 | `main` | `main` |
| `docs/[内容]` | ドキュメントだけの変更 | `main` | `main` |
| `chore/[内容]` | 設定・依存の更新 | `main` | `main` |

- ブランチ名は英語の kebab-case
- 1つのステアリング(`.steering/[日付]-[作業名]/`)に、1つの作業ブランチを対応させる
- `main` へは、プルリクエスト(PR)で squash merge する。`main` に直接コミットしない(初回セットアップのコミットを除く)

### コミットメッセージ

Conventional Commits の形式で、要約は日本語で書く。

```
<type>(<scope>): <要約>

<本文: なぜ変更したか、何を変更したか>
```

**type**:

| type | 用途 |
|------|------|
| `feat` | 機能の追加 |
| `fix` | 不具合の修正 |
| `docs` | ドキュメント |
| `test` | テストの追加・修正 |
| `refactor` | 動作を変えないコードの整理 |
| `perf` | 性能の改善 |
| `style` | 整形だけの変更 |
| `build` | ビルド・依存の変更 |
| `ci` | CIの設定 |
| `chore` | その他 |

**scope**: `domain`・`course`・`rules`・`table`・`cpu`・`courses`・`app`・`ui`・`e2e`・`docs` など、変更した場所

**例**:
```
feat(rules): 行き止まりで負けになる判定を追加

PRDのルール変更(スピンの廃止)に合わせて、手番の開始時に9候補が
すべて選べない場合、そのプレイヤーの負けとする。
- judge.ts に行き止まりの決着を追加
- willBeDeadEnd.ts で移動直後の予告を判定
```

### プルリクエスト

**作成前のチェック**:
- [ ] `npm run lint` が通る
- [ ] `npm run typecheck` が通る
- [ ] `npm test` が通る
- [ ] ルール・CPU・コースを変えた場合、`npm run test:sim` が通る
- [ ] 画面を変えた場合、`npm run test:e2e` が通り、PCとスマホ幅で見た目を確認した

**PRテンプレート**:
```markdown
## 概要
[変更内容を1〜2文で]

## 関連するドキュメント
- ステアリング: .steering/[日付]-[作業名]/
- PRD・設計書の該当箇所: [ファイルと見出し]

## 変更内容
- [変更点]

## テスト
- [ ] ユニットテストを追加・更新した
- [ ] シミュレーションを実行した(該当する場合)
- [ ] E2Eテストを実行した(該当する場合)

## スクリーンショット(画面を変えた場合)
[PCとスマホ幅の画像]
```

## コードレビュー

### レビューの観点

**ルールの正しさ**(最優先):
- [ ] PRDの「ゲームのルール」と一致しているか(特に、縁の上・ゴールラインちょうど・速度0のとどまる手・同着ルール・行き止まり)
- [ ] 判定をドメイン層以外で書き直していないか
- [ ] 境界の値(縁の上、ゴールライン上)のテストがあるか

**設計**:
- [ ] 層の依存ルールを守っているか(`eslint.config.js` に層のルールを入れた後は、ESLint が通れば守られている。入れるのは実装の最初の作業で、それまではレビューで確かめる)
- [ ] 状態を書き換えていないか
- [ ] 乱数・時間をドメイン層で直接使っていないか

**型**:
- [ ] `any` を使っていないか(ESLint でエラーになる)
- [ ] ドメインの型のプロパティと配列に `readonly` が付いているか
- [ ] `enum` ではなく文字列リテラルの合併型を使っているか(ESLint でエラーになる)

**読みやすさ**:
- [ ] 名前が用語集と一致しているか
- [ ] 数値の決めごとに名前が付いているか
- [ ] コメントが「なぜ」を説明しているか

**画面**:
- [ ] 文言を `messages.ts` にまとめているか
- [ ] 色をCSS変数で指定しているか
- [ ] 色と記号の両方で区別しているか。タップする部品が44px以上か

### コメントの書き方

優先度を付けて、理由と代案を書く。

- `[必須]`: 直さないとマージできない
- `[推奨]`: 直すことを勧める
- `[提案]`: 検討してほしい
- `[質問]`: 理解のための質問

```markdown
✅ [必須] ゴールラインにぴったり止まる場合(t = 1)が、交点なしと判定されます。
PRDでは「ゴールライン上にぴったり止まった場合もゴール」なので、
t の範囲を 0 < t <= 1 にしてください。

❌ ここ間違ってます。
```

## 品質の自動化

### コミット前(husky + lint-staged)

既存の設定のとおり、コミット前に次が自動で走る。

- 変更した `.ts` ファイルへの `eslint --fix` と `prettier --write`
- `npm run typecheck`

### CI(GitHub Actions)

リポジトリ(GitHub)への push と PR で、次を実行する。設定(`.github/workflows/ci.yml`)は実装の最初の作業で、`eslint.config.js` の層のルールと一緒に追加する。

| ジョブ | 内容 | タイミング |
|--------|------|-----------|
| check | `npm run lint`・`npm run typecheck`・`npm test` | すべての push・PR |
| build | `npm run build`(表の生成を含む)と `npm run check:size`(配信サイズが `architecture.md` の上限を超えたら失敗) | すべての push・PR |
| e2e | `npm run test:e2e` | PR |
| sim | `npm run test:sim` | `src/domain/`・`src/courses/` を変えた PR |

## リリース(itch.io への公開)

1. `main` で、`npm run lint`・`npm run typecheck`・`npm test`・`npm run test:sim`・`npm run test:e2e` がすべて通ることを確かめる
2. `npm run build` で `dist/` を作り、`npm run preview` で PC とスマホ幅の表示を確かめる
3. itch.io にアップロードする(zip の作り方と itch.io の設定は `docs/architecture.md` の「デプロイ(itch.io)」)
4. `main` にバージョンのタグを付ける(例: `v0.1.0`)。最初の版(P0)を `v0.1.0` とし、P1の機能を足すたびにマイナーバージョンを上げる

## 開発環境

### 必要なツール

| ツール | バージョン | 入れ方 |
|--------|-----------|--------|
| Docker と VS Code(Dev Containers 拡張) | 最新 | 各公式サイト |
| Node.js | v24 LTS | devcontainer に含まれる |
| Playwright のブラウザ | @playwright/test に対応するもの | `npx playwright install --with-deps chromium webkit` |

### セットアップ手順

```bash
# 1. リポジトリを取得して、VS Code の「Reopen in Container」で開く
git clone https://github.com/nogawa-asase/race-track.git
cd race-track

# 2. 依存を入れる(devcontainer の作成時に自動で実行される)
npm install

# 3. E2Eテスト用のブラウザを入れる(初回だけ)
npx playwright install --with-deps chromium webkit

# 4. 開発サーバーを起動する(表の生成が先に走る)
npm run dev
```

- 環境変数や秘密情報の設定は不要(最初の版には秘密情報がない)

## 作業の進め方

`CLAUDE.md` の「スペック駆動開発」に従う。

1. 作業ごとに `.steering/[YYYYMMDD]-[作業名]/` を作り、`requirements.md`・`design.md`・`tasklist.md` を書く
2. 作業ブランチを切り、`tasklist.md` に沿って実装する。進んだら `tasklist.md` を更新する
3. テストを書き、上の「プルリクエスト」のチェックを通す
4. ルールや設計が変わった場合は、`docs/` の該当ドキュメントも同じPRで更新する
