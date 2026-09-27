import type { Course } from '../domain/course/types';
import type {
  Candidate,
  GameResult,
  GameSettings,
  GameState,
  Vec,
} from '../domain/types';

/**
 * 画面が実装するインターフェース(機能設計書「GameView」)。
 * GameController はこれだけを通して画面を操作する
 */
export interface GameView {
  showSettings(defaults: GameSettings): void;
  /** くじの結果を表示し、閉じられる(または一定時間の後)まで待つ */
  showLottery(firstColorOwner: 'human' | 'cpu'): Promise<void>;
  renderBoard(
    state: GameState,
    course: Course,
    candidates: Candidate[] | null
  ): void;
  /** 移動アニメーションを表示し、終わるまで待つ */
  animateMove(player: number, from: Vec, to: Vec): Promise<void>;
  /** メッセージを表示し、閉じられるまで待つ */
  showMessage(message: string): Promise<void>;
  showThinking(visible: boolean): void;
  showResult(result: GameResult, state: GameState): void;
  /** 確認ダイアログを表示し、答え(はい/いいえ)を返す */
  confirm(message: string): Promise<boolean>;
}
