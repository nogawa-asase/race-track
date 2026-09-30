import { turnMessage } from '../../app/messages';
import type { GameState } from '../../domain/types';
import { isMobileLayout } from '../layout';

export interface ControlPanelCallbacks {
  onBackToSettings(): void;
  onShowRules(): void;
  onAutoZoom(): void;
}

/**
 * 操作パネル(機能設計書「レース画面のレイアウト」)。手番・周回の表示と
 * ボタンをまとめる(候補・スタート位置は、いずれも盤に直接タップして
 * 選ぶため、パッドは持たない)
 */
export class ControlPanel {
  private readonly container: HTMLElement;
  private readonly turnEl: HTMLElement;
  private readonly roundEl: HTMLElement;
  private readonly autoZoomButton: HTMLButtonElement;

  constructor(container: HTMLElement, callbacks: ControlPanelCallbacks) {
    this.container = document.createElement('div');
    this.container.className = 'control-panel';

    this.turnEl = document.createElement('p');
    this.turnEl.className = 'turn-indicator';
    this.roundEl = document.createElement('p');
    this.roundEl.className = 'round-indicator';

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
    this.autoZoomButton = document.createElement('button');
    this.autoZoomButton.type = 'button';
    this.autoZoomButton.textContent = 'オートズーム';
    this.autoZoomButton.addEventListener('click', callbacks.onAutoZoom);
    buttons.append(backButton, rulesButton, this.autoZoomButton);

    this.container.append(this.turnEl, this.roundEl, buttons);
    container.append(this.container);
  }

  /** 手番・周回の表示を更新する */
  render(state: GameState, opponent: 'cpu' | 'human'): void {
    const player = state.players[state.turn];
    this.turnEl.textContent = turnMessage(opponent, player.kind, player.color);
    this.turnEl.className = `turn-indicator color-${player.color}`;
    this.roundEl.textContent = `周回: ${state.round}`;
    // スタート位置選び中は周回がまだ始まっていない(常に0)ため、意味の
    // ない表示になる。レース中だけ見せる
    this.roundEl.hidden = state.phase !== 'racing';
    // オートズームはスマホ専用の機能のため、PCでは表示しない
    this.autoZoomButton.hidden = !isMobileLayout();
  }

  destroy(): void {
    this.container.remove();
  }
}
