import { turnMessage } from '../../app/messages';
import type { Candidate, GameState, Vec } from '../../domain/types';
import { StartPositionPad } from './StartPositionPad';

export interface ControlPanelCallbacks {
  onStartPointSelect(point: Vec): void;
  onStartPreviewChange(point: Vec | null): void;
  onBackToSettings(): void;
  onShowRules(): void;
  onAutoZoom(): void;
}

/**
 * 操作パネル(機能設計書「レース画面のレイアウト」)。
 * 手番・周回の表示、パッド(スタート位置選び中だけ表示する。レース中は
 * 盤がズームされ直接タップできるため、候補用のパッドは持たない)、
 * ボタンをまとめる
 */
export class ControlPanel {
  private readonly container: HTMLElement;
  private readonly turnEl: HTMLElement;
  private readonly roundEl: HTMLElement;
  private readonly thinkingEl: HTMLElement;
  private readonly padContainer: HTMLElement;
  private readonly startPositionPad: StartPositionPad;

  constructor(container: HTMLElement, callbacks: ControlPanelCallbacks) {
    this.container = document.createElement('div');
    this.container.className = 'control-panel';

    this.turnEl = document.createElement('p');
    this.turnEl.className = 'turn-indicator';
    this.roundEl = document.createElement('p');
    this.roundEl.className = 'round-indicator';
    this.thinkingEl = document.createElement('p');
    this.thinkingEl.className = 'thinking-indicator';
    this.thinkingEl.textContent = '考え中…';
    this.thinkingEl.hidden = true;

    this.padContainer = document.createElement('div');
    this.startPositionPad = new StartPositionPad(
      this.padContainer,
      callbacks.onStartPointSelect,
      callbacks.onStartPreviewChange
    );

    const buttons = document.createElement('div');
    buttons.className = 'panel-buttons';
    const backButton = document.createElement('button');
    backButton.type = 'button';
    backButton.textContent = '設定に戻る';
    backButton.addEventListener('click', callbacks.onBackToSettings);
    const rulesButton = document.createElement('button');
    rulesButton.type = 'button';
    rulesButton.textContent = 'ルール説明';
    rulesButton.addEventListener('click', callbacks.onShowRules);
    const autoZoomButton = document.createElement('button');
    autoZoomButton.type = 'button';
    autoZoomButton.textContent = 'オートズーム';
    autoZoomButton.addEventListener('click', callbacks.onAutoZoom);
    buttons.append(backButton, rulesButton, autoZoomButton);

    this.container.append(
      this.turnEl,
      this.roundEl,
      this.thinkingEl,
      this.padContainer,
      buttons
    );
    container.append(this.container);
  }

  /**
   * 手番・周回・パッドの表示を更新する。
   *
   * @param candidatesOrPoints - phase が 'placing' なら置ける点の一覧
   *   (レース中は使わない。盤に直接タップして選ぶ)
   */
  render(
    state: GameState,
    opponent: 'cpu' | 'human',
    candidatesOrPoints: readonly Candidate[] | readonly Vec[]
  ): void {
    const player = state.players[state.turn];
    this.turnEl.textContent = turnMessage(opponent, player.kind, player.color);
    this.turnEl.className = `turn-indicator color-${player.color}`;
    this.roundEl.textContent = `周回: ${state.round}`;
    // スタート位置選び中は周回がまだ始まっていない(常に0)ため、意味の
    // ない表示になる。レース中だけ見せる
    this.roundEl.hidden = state.phase !== 'racing';

    if (state.phase === 'placing') {
      this.startPositionPad.render(candidatesOrPoints as Vec[]);
      // CPUの手番では、選べない(=自分のものではない)候補のパッドを
      // 見せる必要がない。一瞬で決まるため、パッドごと隠して
      // 「考え中…」の表示だけにする
      this.padContainer.hidden = player.kind === 'cpu';
    } else {
      // レース中は盤に直接タップして選ぶため、パッドは表示しない
      this.padContainer.hidden = true;
    }
  }

  /** CPUの「考え中」の表示を切り替える */
  setThinking(visible: boolean): void {
    this.thinkingEl.hidden = !visible;
  }

  destroy(): void {
    this.startPositionPad.destroy();
    this.container.remove();
  }
}
