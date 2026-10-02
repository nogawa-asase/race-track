import { turnMessage } from '../../app/messages';
import { onLangChange, pick } from '../../app/i18n';
import type { GameState } from '../../domain/types';
import { isMobileLayout } from '../layout';

export interface ControlPanelCallbacks {
  onBackToSettings(): void;
  onShowRules(): void;
  onAutoZoom(): void;
  onRetire(): void;
}

/**
 * 操作パネル(機能設計書「レース画面のレイアウト」)。手番・ターンの表示と
 * ボタンをまとめる(候補・スタート位置は、いずれも盤に直接タップして
 * 選ぶため、パッドは持たない)
 */
export class ControlPanel {
  private readonly container: HTMLElement;
  private readonly turnEl: HTMLElement;
  private readonly roundEl: HTMLElement;
  private readonly backButton: HTMLButtonElement;
  private readonly rulesButton: HTMLButtonElement;
  private readonly autoZoomButton: HTMLButtonElement;
  private readonly retireButton: HTMLButtonElement;
  private latestState: GameState | null = null;
  private latestOpponent: 'cpu' | 'human' = 'cpu';

  constructor(container: HTMLElement, callbacks: ControlPanelCallbacks) {
    this.container = document.createElement('div');
    this.container.className = 'control-panel';

    this.turnEl = document.createElement('p');
    this.turnEl.className = 'turn-indicator';
    this.roundEl = document.createElement('p');
    this.roundEl.className = 'round-indicator';

    const buttons = document.createElement('div');
    buttons.className = 'panel-buttons';
    this.backButton = document.createElement('button');
    this.backButton.type = 'button';
    this.backButton.addEventListener('click', callbacks.onBackToSettings);
    this.rulesButton = document.createElement('button');
    this.rulesButton.type = 'button';
    this.rulesButton.addEventListener('click', callbacks.onShowRules);
    this.autoZoomButton = document.createElement('button');
    this.autoZoomButton.type = 'button';
    this.autoZoomButton.addEventListener('click', callbacks.onAutoZoom);
    buttons.append(this.backButton, this.rulesButton, this.autoZoomButton);

    // リタイヤは他のボタンと折り返しを共有せず、専用の行に右寄せで置く
    // (同じ flex-wrap の行で margin-left: auto を使うと、折り返しの位置
    // によって盤の幅からはみ出して見えることがあった)
    const retireRow = document.createElement('div');
    retireRow.className = 'retire-row';
    this.retireButton = document.createElement('button');
    this.retireButton.type = 'button';
    this.retireButton.className = 'retire-button';
    this.retireButton.addEventListener('click', callbacks.onRetire);
    retireRow.append(this.retireButton);

    this.container.append(this.turnEl, this.roundEl, buttons, retireRow);
    container.append(this.container);

    this.relabel();
    onLangChange(() => this.relabel());
  }

  /** 手番・ターンの表示を更新する */
  render(state: GameState, opponent: 'cpu' | 'human'): void {
    this.latestState = state;
    this.latestOpponent = opponent;
    this.updateTurnDisplay(state, opponent);
    // オートズームはスマホ専用の機能のため、PCでは表示しない
    this.autoZoomButton.hidden = !isMobileLayout();
  }

  private updateTurnDisplay(state: GameState, opponent: 'cpu' | 'human'): void {
    const player = state.players[state.turn];
    this.turnEl.textContent = turnMessage(opponent, player.kind, player.color);
    this.turnEl.className = `turn-indicator color-${player.color}`;
    this.roundEl.textContent = pick(
      `ターン: ${state.round}`,
      `Turn: ${state.round}`
    );
    // スタート位置選び中はターンがまだ始まっていない(常に0)ため、意味の
    // ない表示になる。レース中だけ見せる
    this.roundEl.hidden = state.phase !== 'racing';
  }

  /** 表示言語が変わるたびに、ボタンと(表示中なら)手番表示の文言を差し替える */
  private relabel(): void {
    this.backButton.textContent = pick('設定に戻る', 'Back to Settings');
    this.rulesButton.textContent = pick('ルール説明', 'How to play');
    this.autoZoomButton.textContent = pick('オートズーム', 'Auto-zoom');
    this.retireButton.textContent = pick('リタイヤ', 'Retire');
    if (this.latestState) {
      this.updateTurnDisplay(this.latestState, this.latestOpponent);
    }
  }

  destroy(): void {
    this.container.remove();
  }
}
