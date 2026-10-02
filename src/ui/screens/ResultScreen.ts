import { playerLabel } from '../../app/messages';
import { onLangChange, pick } from '../../app/i18n';
import type { GameResult, GameState, ResultReason } from '../../domain/types';

export interface ResultScreenCallbacks {
  onRetry(): void;
  onBackToSettings(): void;
}

function reasonLabel(reason: ResultReason): string {
  switch (reason) {
    case 'goal':
      return pick('ゴール', 'Finish');
    case 'tieRule':
      return pick(
        '同着ルール(同じターンでゴールしたため後攻の勝ち)',
        'Tie-break rule (both finished the same turn, so the second player wins)'
      );
    case 'deadEnd':
      return pick('行き止まり', 'Dead end');
    case 'retire':
      return pick('リタイヤ', 'Retired');
  }
}

/** 結果画面(機能設計書「結果画面」) */
export class ResultScreen {
  private readonly container: HTMLElement;
  private readonly winnerEl: HTMLElement;
  private readonly reasonEl: HTMLElement;
  private readonly movesEl: HTMLElement;
  private readonly retryButton: HTMLButtonElement;
  private readonly backButton: HTMLButtonElement;
  private latest: {
    result: GameResult;
    state: GameState;
    opponent: 'cpu' | 'human';
  } | null = null;

  constructor(container: HTMLElement, callbacks: ResultScreenCallbacks) {
    this.container = document.createElement('div');
    this.container.className = 'result-screen';
    this.container.hidden = true;

    this.winnerEl = document.createElement('p');
    this.winnerEl.className = 'winner';
    this.reasonEl = document.createElement('p');
    this.movesEl = document.createElement('p');

    this.retryButton = document.createElement('button');
    this.retryButton.type = 'button';
    this.retryButton.addEventListener('click', callbacks.onRetry);
    this.backButton = document.createElement('button');
    this.backButton.type = 'button';
    this.backButton.addEventListener('click', callbacks.onBackToSettings);
    const buttons = document.createElement('div');
    buttons.className = 'buttons';
    buttons.append(this.retryButton, this.backButton);

    this.container.append(this.winnerEl, this.reasonEl, this.movesEl, buttons);
    container.append(this.container);

    this.relabel();
    onLangChange(() => this.relabel());
  }

  show(result: GameResult, state: GameState, opponent: 'cpu' | 'human'): void {
    this.latest = { result, state, opponent };
    this.renderContent();
    this.container.hidden = false;
  }

  hide(): void {
    this.container.hidden = true;
  }

  private renderContent(): void {
    if (!this.latest) return;
    const { result, state, opponent } = this.latest;
    const winner = state.players[result.winner];
    const winnerLabel = playerLabel(opponent, winner.kind, winner.color);
    this.winnerEl.textContent = pick(
      `${winnerLabel}の勝ち!`,
      `${winnerLabel} wins!`
    );
    this.reasonEl.textContent = pick(
      `決着の理由: ${reasonLabel(result.reason)}`,
      `Reason: ${reasonLabel(result.reason)}`
    );
    this.movesEl.textContent = state.players
      .map((p, i) => {
        const label = playerLabel(opponent, p.kind, p.color);
        const n = result.moveCounts[i];
        return pick(`${label}: ${n}手`, `${label}: ${n} moves`);
      })
      .join(' / ');
  }

  /** 表示言語が変わるたびに、ボタンと(表示中なら)結果の文言を差し替える */
  private relabel(): void {
    this.retryButton.textContent = pick(
      '同じ設定でもう一度',
      'Play again with the same settings'
    );
    this.backButton.textContent = pick('設定に戻る', 'Back to Settings');
    if (!this.container.hidden) {
      this.renderContent();
    }
  }
}
