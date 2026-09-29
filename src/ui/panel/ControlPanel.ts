import { turnMessage } from '../../app/messages';
import type { Candidate, GameState, Vec } from '../../domain/types';
import { DirectionPad } from './DirectionPad';
import { StartPositionPad } from './StartPositionPad';

export interface ControlPanelCallbacks {
  onCandidateSelect(accel: Vec): void;
  onStartPointSelect(point: Vec): void;
  onStartPreviewChange(point: Vec | null): void;
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
  private readonly thinkingEl: HTMLElement;
  private readonly padContainer: HTMLElement;
  private readonly directionPad: DirectionPad;
  private readonly startPositionPad: StartPositionPad;

  constructor(container: HTMLElement, callbacks: ControlPanelCallbacks) {
    this.container = document.createElement('div');
    this.container.className = 'control-panel';

    // 「設定に戻る」「ルール説明」は、手番・パッドの薄クリーム色の枠の
    // 外(下)に置く。枠自体は card 要素にまとめる
    const card = document.createElement('div');
    card.className = 'control-panel-card';

    this.turnEl = document.createElement('p');
    this.turnEl.className = 'turn-indicator';
    this.roundEl = document.createElement('p');
    this.roundEl.className = 'round-indicator';
    this.thinkingEl = document.createElement('p');
    this.thinkingEl.className = 'thinking-indicator';
    this.thinkingEl.textContent = '考え中…';
    this.thinkingEl.hidden = true;

    this.padContainer = document.createElement('div');
    this.directionPad = new DirectionPad(
      this.padContainer,
      callbacks.onCandidateSelect
    );
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
    buttons.append(backButton, rulesButton);

    card.append(this.turnEl, this.roundEl, this.thinkingEl, this.padContainer);
    this.container.append(card, buttons);
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
    this.turnEl.textContent = turnMessage(opponent, player.kind, player.color);
    this.turnEl.className = `turn-indicator color-${player.color}`;
    this.roundEl.textContent = `周回: ${state.round}`;
    // スタート位置選び中は周回がまだ始まっていない(常に0)ため、意味の
    // ない表示になる。レース中だけ見せる
    this.roundEl.hidden = state.phase !== 'racing';

    if (state.phase === 'racing') {
      this.directionPad.render(candidatesOrPoints as Candidate[], player.color);
      this.setPadVisible('direction');
    } else {
      this.startPositionPad.render(candidatesOrPoints as Vec[]);
      this.setPadVisible('start');
    }
    // CPUの手番では、選べない(=自分のものではない)候補のパッドを
    // 見せる必要がない。一瞬で決まるため、パッドごと隠して
    // 「考え中…」の表示だけにする
    this.padContainer.hidden = player.kind === 'cpu';
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

  /** CPUの「考え中」の表示を切り替える */
  setThinking(visible: boolean): void {
    this.thinkingEl.hidden = !visible;
  }

  destroy(): void {
    this.directionPad.destroy();
    this.startPositionPad.destroy();
    this.container.remove();
  }
}
