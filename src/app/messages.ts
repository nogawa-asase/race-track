import { pick } from './i18n';
import type { PenColor } from '../domain/types';

function colorName(color: PenColor): string {
  return color === 'red' ? pick('赤', 'Red') : pick('青', 'Blue');
}

/**
 * プレイヤーの表示名(機能設計書「メッセージ」)。「鉛筆」は付けず、色名だけ、
 * または(CPU戦のときだけ)「あなた」「CPU」に色名を添えた形にする
 */
export function playerLabel(
  opponent: 'cpu' | 'human',
  playerKind: 'human' | 'cpu',
  color: PenColor
): string {
  if (opponent === 'human') {
    return colorName(color);
  }
  if (playerKind === 'cpu') {
    return pick(`CPU(${colorName(color)})`, `CPU (${colorName(color)})`);
  }
  return pick(`あなた(${colorName(color)})`, `You (${colorName(color)})`);
}

/** 手番のプレイヤーの表示(機能設計書「メッセージ」) */
export function turnMessage(
  opponent: 'cpu' | 'human',
  playerKind: 'human' | 'cpu',
  color: PenColor
): string {
  if (playerKind === 'cpu' && opponent === 'cpu') {
    return thinkingMessage(color);
  }
  if (opponent === 'cpu' && playerKind === 'human') {
    // 英語では「You (Red)'s turn」のような所有格の重なりを避ける
    return pick(
      `あなた(${colorName(color)})の番です`,
      `Your turn (${colorName(color)})`
    );
  }
  const label = playerLabel(opponent, playerKind, color);
  return pick(`${label}の番です`, `${label}'s turn`);
}

/** CPUの手番の表示 */
export function thinkingMessage(color: PenColor): string {
  return pick(
    `CPU(${colorName(color)})が考え中…`,
    `CPU (${colorName(color)}) is thinking…`
  );
}

/**
 * 「おまかせ」(先攻後攻のランダム決定)の結果の表示。人同士は showLottery を
 * 呼ばず、代わりにこの関数を(人同士向けの)一度だけの表示に使う
 */
export function lotteryMessage(
  opponent: 'cpu' | 'human',
  firstColorOwner: 'human' | 'cpu',
  firstColor: PenColor
): string {
  if (opponent === 'human') {
    return pick(
      `${colorName(firstColor)}が先攻です`,
      `${colorName(firstColor)} goes first`
    );
  }
  return firstColorOwner === 'human'
    ? pick('あなたが先攻です', 'You go first')
    : pick('CPUが先攻です', 'CPU goes first');
}

/** 表示名を組み立てるのに必要な、プレイヤーの種類と色 */
export interface PlayerRef {
  readonly kind: 'human' | 'cpu';
  readonly color: PenColor;
}

/** 次の手番で行き止まりになる点に移動したときの予告 */
export function deadEndWarning(): string {
  return pick(
    '次の手番では、どこにも進めません',
    "You won't be able to move anywhere on your next turn"
  );
}

/** 行き止まりで決着したときの表示 */
export function deadEndResultMessage(
  opponent: 'cpu' | 'human',
  loser: PlayerRef,
  winner: PlayerRef
): string {
  const loserLabel = playerLabel(opponent, loser.kind, loser.color);
  const winnerLabel = playerLabel(opponent, winner.kind, winner.color);
  return pick(
    `${loserLabel}は、どこにも進めません。${winnerLabel}の勝ちです`,
    `${loserLabel} can't move anywhere. ${winnerLabel} wins!`
  );
}

/** 先攻がゴールし、後攻の手番がまだ残っているときの表示 */
export function tieRulePendingMessage(
  opponent: 'cpu' | 'human',
  goaled: PlayerRef,
  otherPlayer: PlayerRef
): string {
  const goaledLabel = playerLabel(opponent, goaled.kind, goaled.color);
  const otherLabel = playerLabel(opponent, otherPlayer.kind, otherPlayer.color);
  return pick(
    `${goaledLabel}がゴール! ${otherLabel}がこの手でゴールすれば、同着ルールで${otherLabel}の勝ちです`,
    `${goaledLabel} finished! If ${otherLabel} finishes on this move too, ${otherLabel} wins by the tie-break rule`
  );
}

/** 設定に戻る前の確認 */
export function confirmBackToSettings(): string {
  return pick(
    'レースをやめて、設定に戻りますか?',
    'Quit the race and return to settings?'
  );
}

/** リタイヤ前の確認 */
export function confirmRetire(): string {
  return pick(
    'リタイヤしますか? 相手の勝ちになります',
    'Retire? Your opponent will win'
  );
}

/** リタイヤで決着したときの表示 */
export function retireResultMessage(
  opponent: 'cpu' | 'human',
  loser: PlayerRef,
  winner: PlayerRef
): string {
  const loserLabel = playerLabel(opponent, loser.kind, loser.color);
  const winnerLabel = playerLabel(opponent, winner.kind, winner.color);
  return pick(
    `${loserLabel}がリタイヤしました。${winnerLabel}の勝ちです`,
    `${loserLabel} retired. ${winnerLabel} wins!`
  );
}

/** 想定外のエラーで、レースを中断して設定に戻すときの表示 */
export function errorReturnToSettings(): string {
  return pick(
    'エラーが起きました。設定画面に戻ります',
    'An error occurred. Returning to the settings screen'
  );
}
