import type { PenColor } from '../domain/types';

function colorName(color: PenColor): string {
  return color === 'red' ? '赤' : '青';
}

/** 手番のプレイヤーの表示(機能設計書「メッセージ」) */
export function turnMessage(
  opponent: 'cpu' | 'human',
  playerKind: 'human' | 'cpu',
  color: PenColor
): string {
  if (opponent === 'human') {
    return `${colorName(color)}鉛筆の番です`;
  }
  if (playerKind === 'cpu') {
    return thinkingMessage(color);
  }
  return `あなた(${colorName(color)}鉛筆)の番です`;
}

/** CPUの手番の表示 */
export function thinkingMessage(color: PenColor): string {
  return `CPU(${colorName(color)}鉛筆)が考え中…`;
}

/**
 * くじの結果の表示。人同士は showLottery を呼ばず、代わりにこの関数を
 * (人同士向けの)一度だけの表示に使う
 */
export function lotteryMessage(
  opponent: 'cpu' | 'human',
  firstColorOwner: 'human' | 'cpu',
  firstColor: PenColor
): string {
  if (opponent === 'human') {
    return `${colorName(firstColor)}鉛筆が先攻です`;
  }
  const who = firstColorOwner === 'human' ? 'あなた' : 'CPU';
  return `くじの結果、${who}が先攻(${colorName(firstColor)}鉛筆)です`;
}

/** 次の手番で行き止まりになる点に移動したときの予告 */
export const DEAD_END_WARNING = '次の手番では、どこにも進めません';

/** 行き止まりで決着したときの表示 */
export function deadEndResultMessage(
  loserColor: PenColor,
  winnerColor: PenColor
): string {
  return `${colorName(loserColor)}鉛筆は、どこにも進めません。${colorName(winnerColor)}鉛筆の勝ちです`;
}

/** 先攻がゴールし、後攻の手番がまだ残っているときの表示 */
export function tieRulePendingMessage(
  goaledColor: PenColor,
  opponentColor: PenColor
): string {
  return `${colorName(goaledColor)}鉛筆がゴール! ${colorName(opponentColor)}鉛筆がこの手でゴールすれば、同着ルールで${colorName(opponentColor)}鉛筆の勝ちです`;
}

/** 設定に戻る前の確認 */
export const CONFIRM_BACK_TO_SETTINGS = 'レースをやめて、設定に戻りますか?';

/** 想定外のエラーで、レースを中断して設定に戻すときの表示 */
export const ERROR_RETURN_TO_SETTINGS =
  'エラーが起きました。設定画面に戻ります';
