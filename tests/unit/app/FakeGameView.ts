import type { Course } from '../../../src/domain/course/types';
import type {
  Candidate,
  GameResult,
  GameSettings,
  GameState,
  Vec,
} from '../../../src/domain/types';
import type { GameView } from '../../../src/app/GameView';

interface Deferred<T> {
  readonly promise: Promise<T>;
  resolve(value: T): void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

/**
 * テスト用の GameView。呼び出し履歴を記録し、Promise を返すメソッドは、
 * テスト側で答えを積んでおくか、resolveNext で明示的に解決する
 */
export class FakeGameView implements GameView {
  readonly settingsShown: GameSettings[] = [];
  readonly messages: string[] = [];
  readonly rendered: {
    state: GameState;
    course: Course;
    candidates: Candidate[] | null;
  }[] = [];
  readonly animations: { player: number; from: Vec; to: Vec }[] = [];
  readonly thinkingCalls: boolean[] = [];
  readonly results: { result: GameResult; state: GameState }[] = [];
  lotteryShown: ('human' | 'cpu')[] = [];

  /** confirm の答えを、呼ばれる順に積んでおく */
  private confirmAnswers: boolean[] = [];

  private pendingMessages: Deferred<void>[] = [];
  private pendingLottery: Deferred<void>[] = [];
  private pendingAnimations: Deferred<void>[] = [];

  queueConfirm(...answers: boolean[]): void {
    this.confirmAnswers.push(...answers);
  }

  /** showMessage の呼び出しをすべて即座に解決する(既定の動き) */
  autoResolveMessages = true;
  autoResolveLottery = true;
  autoResolveAnimations = true;

  showSettings(defaults: GameSettings): void {
    this.settingsShown.push(defaults);
  }

  showLottery(firstColorOwner: 'human' | 'cpu'): Promise<void> {
    this.lotteryShown.push(firstColorOwner);
    const d = deferred<void>();
    if (this.autoResolveLottery) d.resolve();
    else this.pendingLottery.push(d);
    return d.promise;
  }

  renderBoard(
    state: GameState,
    course: Course,
    candidates: Candidate[] | null
  ): void {
    this.rendered.push({ state, course, candidates });
  }

  animateMove(player: number, from: Vec, to: Vec): Promise<void> {
    this.animations.push({ player, from, to });
    const d = deferred<void>();
    if (this.autoResolveAnimations) d.resolve();
    else this.pendingAnimations.push(d);
    return d.promise;
  }

  showMessage(message: string): Promise<void> {
    this.messages.push(message);
    const d = deferred<void>();
    if (this.autoResolveMessages) d.resolve();
    else this.pendingMessages.push(d);
    return d.promise;
  }

  showThinking(visible: boolean): void {
    this.thinkingCalls.push(visible);
  }

  showResult(result: GameResult, state: GameState): void {
    this.results.push({ result, state });
  }

  confirm(_message: string): Promise<boolean> {
    return Promise.resolve(this.confirmAnswers.shift() ?? false);
  }

  /** 保留中の showMessage をすべて解決する(待たせたいテストで使う) */
  resolvePendingMessages(): void {
    for (const d of this.pendingMessages.splice(0)) d.resolve();
  }
}
