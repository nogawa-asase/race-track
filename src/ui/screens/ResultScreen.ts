import { playerLabel } from '../../app/messages';
import type { GameResult, GameState, ResultReason } from '../../domain/types';

export interface ResultScreenCallbacks {
  onRetry(): void;
  onBackToSettings(): void;
}

function reasonLabel(reason: ResultReason): string {
  switch (reason) {
    case 'goal':
      return 'ゴール';
    case 'tieRule':
      return '同着ルール(同じ周回でゴールしたため後攻の勝ち)';
    case 'deadEnd':
      return '行き止まり';
  }
}

/** 結果画面(機能設計書「結果画面」) */
export class ResultScreen {
  private readonly container: HTMLElement;
  private readonly winnerEl: HTMLElement;
  private readonly reasonEl: HTMLElement;
  private readonly movesEl: HTMLElement;

  constructor(container: HTMLElement, callbacks: ResultScreenCallbacks) {
    this.container = document.createElement('div');
    this.container.className = 'result-screen';
    this.container.hidden = true;

    this.winnerEl = document.createElement('p');
    this.winnerEl.className = 'winner';
    this.reasonEl = document.createElement('p');
    this.movesEl = document.createElement('p');

    const retryButton = document.createElement('button');
    retryButton.type = 'button';
    retryButton.textContent = '同じ設定でもう一度';
    retryButton.addEventListener('click', callbacks.onRetry);
    const backButton = document.createElement('button');
    backButton.type = 'button';
    backButton.textContent = '設定に戻る';
    backButton.addEventListener('click', callbacks.onBackToSettings);
    const buttons = document.createElement('div');
    buttons.className = 'buttons';
    buttons.append(retryButton, backButton);

    this.container.append(this.winnerEl, this.reasonEl, this.movesEl, buttons);
    container.append(this.container);
  }

  show(result: GameResult, state: GameState, opponent: 'cpu' | 'human'): void {
    const winner = state.players[result.winner];
    this.winnerEl.textContent = `${playerLabel(opponent, winner.kind, winner.color)}の勝ち!`;
    this.reasonEl.textContent = `決着の理由: ${reasonLabel(result.reason)}`;
    this.movesEl.textContent = state.players
      .map(
        (p, i) =>
          `${playerLabel(opponent, p.kind, p.color)}: ${result.moveCounts[i]}手`
      )
      .join(' / ');
    this.container.hidden = false;
  }

  hide(): void {
    this.container.hidden = true;
  }
}
