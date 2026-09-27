import { turnMessage } from '../../app/messages';
import type { Candidate, GameState, Vec } from '../../domain/types';
import { DirectionPad } from './DirectionPad';
import { StartPositionPad } from './StartPositionPad';

export interface ControlPanelCallbacks {
  onCandidateSelect(accel: Vec): void;
  onStartPointSelect(point: Vec): void;
  onBackToSettings(): void;
  onShowRules(): void;
}

/**
 * 操作パネル(機能設計書「レース画面のレイアウト」)。
 * 手番・周回の表示、パッド(レース中は方向パッド、スタート位置選び中は
 * スタート位置選びのパッド)、ボタンをまとめる
 */
export class ControlPanel {
  private readonly container: HTMLElement;
  private readonly turnEl: HTMLElement;
  private readonly roundEl: HTMLElement;
  private readonly padContainer: HTMLElement;
  private readonly directionPad: DirectionPad;
  private readonly startPositionPad: StartPositionPad;

  constructor(container: HTMLElement, callbacks: ControlPanelCallbacks) {
    this.container = document.createElement('div');
    this.container.className = 'control-panel';

    this.turnEl = document.createElement('p');
    this.turnEl.className = 'turn-indicator';
    this.roundEl = document.createElement('p');
    this.roundEl.className = 'round-indicator';

    this.padContainer = document.createElement('div');
    this.directionPad = new DirectionPad(
      this.padContainer,
      callbacks.onCandidateSelect
    );
    this.startPositionPad = new StartPositionPad(
      this.padContainer,
      callbacks.onStartPointSelect
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
    buttons.append(backButton, rulesButton);

    this.container.append(
      this.turnEl,
      this.roundEl,
      this.padContainer,
      buttons
    );
    container.append(this.container);
  }

  /**
   * 手番・周回・パッドの表示を更新する。
   *
   * @param candidatesOrPoints - phase が 'racing' なら9候補、'placing' なら
   *   置ける点の一覧
   */
  render(
    state: GameState,
    opponent: 'cpu' | 'human',
    candidatesOrPoints: readonly Candidate[] | readonly Vec[]
  ): void {
    const player = state.players[state.turn];
    this.turnEl.textContent = turnMessage(opponent, player.color);
    this.turnEl.className = `turn-indicator color-${player.color}`;
    this.roundEl.textContent = `周回: ${state.round}`;

    if (state.phase === 'racing') {
      this.directionPad.render(candidatesOrPoints as Candidate[], player.color);
      this.setPadVisible('direction');
    } else {
      this.startPositionPad.render(candidatesOrPoints as Vec[]);
      this.setPadVisible('start');
    }
  }

  private setPadVisible(which: 'direction' | 'start'): void {
    this.directionPadElement.style.display =
      which === 'direction' ? '' : 'none';
    this.startPadElement.style.display = which === 'start' ? '' : 'none';
  }

  private get directionPadElement(): HTMLElement {
    return this.padContainer.querySelector('.direction-pad') as HTMLElement;
  }

  private get startPadElement(): HTMLElement {
    return this.padContainer.querySelector(
      '.start-position-pad'
    ) as HTMLElement;
  }

  destroy(): void {
    this.directionPad.destroy();
    this.startPositionPad.destroy();
    this.container.remove();
  }
}
