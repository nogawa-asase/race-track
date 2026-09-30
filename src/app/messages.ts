import type { PenColor } from '../domain/types';

function colorName(color: PenColor): string {
  return color === 'red' ? '赤' : '青';
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
  return playerKind === 'cpu'
    ? `CPU(${colorName(color)})`
    : `あなた(${colorName(color)})`;
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
  return `${playerLabel(opponent, playerKind, color)}の番です`;
}

/** CPUの手番の表示 */
export function thinkingMessage(color: PenColor): string {
  return `CPU(${colorName(color)})が考え中…`;
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
    return `${colorName(firstColor)}が先攻です`;
  }
  const who = firstColorOwner === 'human' ? 'あなた' : 'CPU';
  return `${who}が先攻です`;
}

/** 表示名を組み立てるのに必要な、プレイヤーの種類と色 */
export interface PlayerRef {
  readonly kind: 'human' | 'cpu';
  readonly color: PenColor;
}

/** 次の手番で行き止まりになる点に移動したときの予告 */
export const DEAD_END_WARNING = '次の手番では、どこにも進めません';

/** 行き止まりで決着したときの表示 */
export function deadEndResultMessage(
  opponent: 'cpu' | 'human',
  loser: PlayerRef,
  winner: PlayerRef
): string {
  const loserLabel = playerLabel(opponent, loser.kind, loser.color);
  const winnerLabel = playerLabel(opponent, winner.kind, winner.color);
  return `${loserLabel}は、どこにも進めません。${winnerLabel}の勝ちです`;
}

/** 先攻がゴールし、後攻の手番がまだ残っているときの表示 */
export function tieRulePendingMessage(
  opponent: 'cpu' | 'human',
  goaled: PlayerRef,
  otherPlayer: PlayerRef
): string {
  const goaledLabel = playerLabel(opponent, goaled.kind, goaled.color);
  const otherLabel = playerLabel(opponent, otherPlayer.kind, otherPlayer.color);
  return `${goaledLabel}がゴール! ${otherLabel}がこの手でゴールすれば、同着ルールで${otherLabel}の勝ちです`;
}

/** 設定に戻る前の確認 */
export const CONFIRM_BACK_TO_SETTINGS = 'レースをやめて、設定に戻りますか?';

/** リタイヤ前の確認 */
export const CONFIRM_RETIRE = 'リタイヤしますか? 相手の勝ちになります';

/** リタイヤで決着したときの表示 */
export function retireResultMessage(
  opponent: 'cpu' | 'human',
  loser: PlayerRef,
  winner: PlayerRef
): string {
  const loserLabel = playerLabel(opponent, loser.kind, loser.color);
  const winnerLabel = playerLabel(opponent, winner.kind, winner.color);
  return `${loserLabel}がリタイヤしました。${winnerLabel}の勝ちです`;
}

/** 想定外のエラーで、レースを中断して設定に戻すときの表示 */
export const ERROR_RETURN_TO_SETTINGS =
  'エラーが起きました。設定画面に戻ります';
