import type { GameView } from './GameView';
import {
  CONFIRM_BACK_TO_SETTINGS,
  CONFIRM_RETIRE,
  DEAD_END_WARNING,
  ERROR_RETURN_TO_SETTINGS,
  deadEndResultMessage,
  lotteryMessage,
  retireResultMessage,
  tieRulePendingMessage,
} from './messages';
import { loadTable } from './loadTable';
import { getCourseDefinition } from '../courses';
import { buildCourse } from '../domain/course/buildCourse';
import type { Course } from '../domain/course/types';
import { chooseMove } from '../domain/cpu/chooseMove';
import { chooseStartPoint } from '../domain/cpu/chooseStartPoint';
import type { Random } from '../domain/cpu/random';
import { applyAction } from '../domain/rules/applyAction';
import { isSelectable } from '../domain/rules/classify';
import { createGame } from '../domain/rules/createGame';
import { finish, settleDeadEnd } from '../domain/rules/judge';
import { listCandidates } from '../domain/rules/listCandidates';
import { listStartPoints } from '../domain/rules/listStartPoints';
import { willBeDeadEnd } from '../domain/rules/willBeDeadEnd';
import type { DistanceTable } from '../domain/table/types';
import type {
  Action,
  Candidate,
  GameSettings,
  GameState,
  Vec,
} from '../domain/types';
import { equals } from '../domain/vec';

/** 本番用の Random(Math.random をそのまま使う。ドメイン層には置けない) */
const mathRandom: Random = { next: () => Math.random() };

/** CPUの手番で「考え中」を表示する時間(PRDの非機能要件) */
const DEFAULT_THINKING_MS = 500;

/**
 * 行き止まりが確定したとき、矢印と9候補(すべてバツ)を見せてから、
 * 決着(結果画面につながるメッセージ)を出すまで置く間
 */
const DEFAULT_DEAD_END_PAUSE_MS = 1000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 画面の流れと手番の進行を管理する(機能設計書「GameController」)。
 * ドメイン層の関数だけを呼ぶ調整役で、DOMやタイマーは扱わない
 * (待ち時間・アニメーションは GameView に委ねる)
 */
export class GameController {
  private settings: GameSettings | null = null;
  private course: Course | null = null;
  private table: DistanceTable | null = null;
  private state: GameState | null = null;
  /**
   * backToSettings・retry のたびに増やす通し番号。CPUの「考え中」や
   * アニメーションの待ちが終わったとき、この番号が変わっていれば
   * (別のレースに切り替わっていれば)何もせずに終える
   */
  private raceToken = 0;
  /** ルール説明が開いている間、CPUの手番の進行を止める(PRD「6-2. ルール説明」) */
  private rulesOpen = false;
  private rulesWaiters: Array<() => void> = [];
  /**
   * 今の手番で、行き止まりのアラート(設定がオンのとき)によって断った
   * 加速(候補)。断った候補は、選び直すまで盤にバツで表示し続ける。
   * 手番が変わるたびに空にする
   */
  private rejectedAccels: Vec[] = [];

  constructor(
    private readonly view: GameView,
    private readonly random: Random = mathRandom,
    private readonly thinkingMs: number = DEFAULT_THINKING_MS,
    private readonly deadEndPauseMs: number = DEFAULT_DEAD_END_PAUSE_MS
  ) {}

  /** コースの準備(表の読み込み)→ くじ → スタート位置選び */
  async startGame(settings: GameSettings): Promise<void> {
    const token = ++this.raceToken;
    this.settings = settings;
    this.course = buildCourse(getCourseDefinition(settings.courseId));

    try {
      this.table = await loadTable(this.course);
    } catch {
      this.table = null;
      await this.returnToSettingsAfterError();
      return;
    }
    if (!this.isCurrent(token)) return;

    await this.beginRace(token);
  }

  /** 同じ設定でもう一度(表は読み込み直さず使い回す) */
  async retry(): Promise<void> {
    if (!this.settings || !this.course || !this.table) return;
    const token = ++this.raceToken;
    await this.beginRace(token);
  }

  /**
   * ルール説明が開いている間、CPUの手番の進行を止める。
   * 「考え中」を表示する直前と、待ちが終わった直後の2箇所で待ち合わせる
   * (機能設計書「レース画面のレイアウト」)
   */
  pauseForRules(): void {
    this.rulesOpen = true;
  }

  /** ルール説明を閉じたら呼ぶ。止めていたCPUの手番を再開する */
  resumeFromRules(): void {
    this.rulesOpen = false;
    const waiters = this.rulesWaiters.splice(0);
    for (const resolve of waiters) {
      resolve();
    }
  }

  private waitIfRulesOpen(): Promise<void> {
    if (!this.rulesOpen) {
      return Promise.resolve();
    }
    return new Promise((resolve) => this.rulesWaiters.push(resolve));
  }

  /** 確認のうえ設定画面に戻る(スタート位置選び・レース画面から) */
  async backToSettings(): Promise<void> {
    const ok = await this.view.confirm(CONFIRM_BACK_TO_SETTINGS);
    if (!ok || !this.settings) return;
    this.returnToSettings();
  }

  /**
   * 確認なしで設定画面に戻る(結果画面から。
   * 機能設計書の状態遷移図で「結果 → 設定」に確認がないとおりの動作)
   */
  backToSettingsFromResult(): void {
    if (!this.settings) return;
    this.returnToSettings();
  }

  private returnToSettings(): void {
    this.raceToken++; // 進行中の非同期処理を無効化する
    this.state = null;
    this.view.showSettings(this.settings!);
  }

  /**
   * 確認のうえリタイヤする(スタート位置選び・レース画面から)。
   * CPU戦は、手番によらずいつも人が負け・CPUの勝ちになる。人同士は、
   * 今の手番のプレイヤーが負けになる(この画面を操作している側が
   * 諦めたとみなす)
   */
  async retire(): Promise<void> {
    if (!this.state || !this.settings || this.state.phase === 'finished') {
      return;
    }
    const ok = await this.view.confirm(CONFIRM_RETIRE);
    // confirm() で待っている間に、進行中だったCPUの手番などが決着させて
    // いることもあるため、待ったあとの this.state を改めて読み直す
    const settings = this.settings;
    const state = this.state;
    if (!ok || !state || !settings || state.phase === 'finished') {
      return;
    }
    this.raceToken++; // 進行中のCPUの手番などを無効化する
    const token = this.raceToken;

    const loserIndex =
      settings.opponent === 'cpu'
        ? state.players.findIndex((p) => p.kind === 'human')
        : state.turn;
    const winnerIndex = 1 - loserIndex;
    const loser = state.players[loserIndex];
    const winner = state.players[winnerIndex];

    this.state = finish(state, winnerIndex, 'retire');
    await this.view.showMessage(
      retireResultMessage(settings.opponent, loser, winner)
    );
    if (!this.isCurrent(token) || !this.state) return;
    this.view.showResult(this.state.result!, this.state, settings.opponent);
  }

  /** 盤の点がクリック・タップで確定された */
  onPointSelected(point: Vec): void {
    const state = this.state;
    if (!state || state.players[state.turn].kind !== 'human') return;

    if (state.phase === 'placing') {
      this.tryApply(state, { type: 'place', point });
      return;
    }
    if (state.phase === 'racing') {
      const candidates = listCandidates(state, this.course!);
      const candidate = candidates.find((c) => equals(c.target, point));
      if (!candidate || !isSelectable(candidate)) return;

      if (
        this.settings!.alert &&
        this.wouldCauseDeadEnd(state, candidate.accel)
      ) {
        this.rejectDeadEndCandidate(state, candidates, candidate.accel);
        return;
      }
      this.tryApply(state, { type: 'move', accel: candidate.accel });
    }
  }

  /**
   * その加速で動くと、指した本人が次の手番で行き止まりになるか
   * (行き止まりのアラート用。実際には動かさず判定だけする)
   */
  private wouldCauseDeadEnd(state: GameState, accel: Vec): boolean {
    const next = applyAction(state, this.course!, { type: 'move', accel });
    return willBeDeadEnd(next, this.course!, state.turn);
  }

  /**
   * 行き止まりのアラート(設定オン)により、選んだ候補を断る。移動は
   * せず、その候補をバツとして描き直してからメッセージを見せる
   * (機能設計書「危ない手のアラート」)
   */
  private rejectDeadEndCandidate(
    state: GameState,
    candidates: readonly Candidate[],
    rejectedAccel: Vec
  ): void {
    this.rejectedAccels.push(rejectedAccel);
    const patched = candidates.map((c) =>
      this.rejectedAccels.some((a) => equals(a, c.accel))
        ? { ...c, status: 'deadEnd' as const }
        : c
    );
    this.view.renderBoard(state, this.course!, patched);
    void this.view.showMessage(DEAD_END_WARNING);
  }

  /** 方向パッドでの確定(レース中のみ) */
  onPadSelected(accel: Vec): void {
    const state = this.state;
    if (
      !state ||
      state.phase !== 'racing' ||
      state.players[state.turn].kind !== 'human'
    ) {
      return;
    }
    this.tryApply(state, { type: 'move', accel });
  }

  /** ルールに合わない操作は無視する(選べない操作は画面側で無効化済み。開発時のみ記録) */
  private tryApply(state: GameState, action: Action): void {
    try {
      const next = applyAction(state, this.course!, action);
      const token = this.raceToken;
      this.state = next;
      void this.afterAction(token, state, action);
    } catch (error) {
      console.error('ルールに合わない行動:', action, error);
    }
  }

  /** 先攻決め(くじ・指定・人同士)を行い、スタート位置選びから進める */
  private async beginRace(token: number): Promise<void> {
    const settings = this.settings!;
    let firstPlayer: 'human' | 'cpu' = 'human';

    if (settings.opponent === 'cpu') {
      if (settings.turnOrder === 'lottery') {
        firstPlayer = this.random.next() < 0.5 ? 'human' : 'cpu';
        await this.view.showLottery(firstPlayer);
      } else {
        firstPlayer = settings.turnOrder === 'first' ? 'human' : 'cpu';
      }
    } else {
      await this.view.showMessage(lotteryMessage('human', 'human', 'red'));
    }
    if (!this.isCurrent(token)) return;

    this.state = createGame(settings, firstPlayer);
    await this.runTurns(token);
  }

  /**
   * 手番を進める。CPUの手番は自動で進め、人の手番になったら止まって
   * onPointSelected・onPadSelected を待つ。
   *
   * ループではなく再帰にしている: CPUの手番(`playCpuTurn`)は、内部で
   * `afterAction` → `finish` → `runTurns` と連鎖して次の手番まで進めるため、
   * `playCpuTurn` の後にもう一度ループを回すと、その連鎖がすでに描画した
   * 状態(決着後の結果画面を含む)の上から、二重に(しかも `phase` が
   * `'finished'` なのに `candidates: null` で)`renderBoard` を呼んでしまい、
   * 決着直後に結果画面が隠れてスタート位置選びの操作パネルが再表示される
   * 実バグがあった
   */
  private async runTurns(token: number): Promise<void> {
    if (!this.isCurrent(token) || !this.state) return;
    this.rejectedAccels = [];

    const candidates =
      this.state.phase === 'racing'
        ? listCandidates(this.state, this.course!)
        : null;

    if (candidates && !candidates.some(isSelectable)) {
      // 行き止まり: いきなり結果を出さず、まず矢印と9候補(すべてバツ)を
      // 見せてから、少し間を置いて決着させる
      this.view.renderBoard(this.state, this.course!, candidates);
      await delay(this.deadEndPauseMs);
      if (!this.isCurrent(token) || !this.state) return;
      const settled = settleDeadEnd(this.state, this.course!);
      this.state = settled;
      await this.finish(token);
      return;
    }

    const player = this.state.players[this.state.turn];
    this.view.renderBoard(this.state, this.course!, candidates);

    if (player.kind === 'human') {
      return; // onPointSelected・onPadSelected を待つ
    }

    await this.playCpuTurn(token, candidates);
  }

  private async playCpuTurn(
    token: number,
    candidates: ReturnType<typeof listCandidates> | null
  ): Promise<void> {
    await this.waitIfRulesOpen();
    if (!this.isCurrent(token)) return;
    const state = this.state!;
    const player = state.players[state.turn];
    this.view.showThinking(true);
    await delay(this.thinkingMs);
    await this.waitIfRulesOpen();
    if (!this.isCurrent(token)) return;

    let action: Action;
    try {
      if (state.phase === 'placing') {
        const point = chooseStartPoint(
          listStartPoints(state, this.course!),
          this.table!,
          player.cpuLevel!,
          this.random
        );
        action = { type: 'place', point };
      } else {
        const accel = chooseMove(
          candidates!,
          player.velocity,
          this.table!,
          player.cpuLevel!,
          this.random
        );
        action = { type: 'move', accel };
      }
    } catch (error) {
      this.view.showThinking(false);
      console.error('CPUの選択でエラーが起きました:', error);
      await this.returnToSettingsAfterError();
      return;
    }

    this.view.showThinking(false);
    const next = applyAction(state, this.course!, action);
    this.state = next;
    await this.afterAction(token, state, action);
  }

  /** 行動を適用した後の共通処理(アニメーション・メッセージ・次の手番) */
  private async afterAction(
    token: number,
    before: GameState,
    action: Action
  ): Promise<void> {
    if (!this.isCurrent(token) || !this.state) return;
    const playerIndex = action.type === 'place' ? before.turn : before.turn;
    const from = before.players[playerIndex].position;
    const to = this.state.players[playerIndex].position!;

    if (action.type === 'move') {
      if (from) {
        await this.view.animateMove(playerIndex, from, to);
        if (!this.isCurrent(token)) return;
      }

      if (willBeDeadEnd(this.state, this.course!, playerIndex)) {
        await this.view.showMessage(DEAD_END_WARNING);
        if (!this.isCurrent(token)) return;
      }

      const movedPlayer = this.state.players[playerIndex];
      if (
        this.state.phase === 'racing' &&
        movedPlayer.goalRound === before.round
      ) {
        const opponentIndex = 1 - playerIndex;
        await this.view.showMessage(
          tieRulePendingMessage(
            this.settings!.opponent,
            movedPlayer,
            this.state.players[opponentIndex]
          )
        );
        if (!this.isCurrent(token)) return;
      }
    }

    await this.finish(token);
  }

  /** 決着していれば結果を表示する。していなければ手番の進行を続ける */
  private async finish(token: number): Promise<void> {
    if (!this.isCurrent(token) || !this.state) return;
    if (this.state.phase !== 'finished') {
      await this.runTurns(token);
      return;
    }
    const result = this.state.result!;
    if (result.reason === 'deadEnd') {
      const loser = this.state.players[1 - result.winner];
      const winner = this.state.players[result.winner];
      await this.view.showMessage(
        deadEndResultMessage(this.settings!.opponent, loser, winner)
      );
      if (!this.isCurrent(token)) return;
    }
    this.view.showResult(result, this.state, this.settings!.opponent);
  }

  private async returnToSettingsAfterError(): Promise<void> {
    this.raceToken++;
    this.state = null;
    await this.view.showMessage(ERROR_RETURN_TO_SETTINGS);
    if (this.settings) {
      this.view.showSettings(this.settings);
    }
  }

  private isCurrent(token: number): boolean {
    return token === this.raceToken;
  }
}
