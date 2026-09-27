import {
  deadEndResultMessage,
  lotteryMessage,
  thinkingMessage,
  tieRulePendingMessage,
  turnMessage,
} from '../../../src/app/messages';

describe('messages', () => {
  it('人の手番(CPU戦)', () => {
    expect(turnMessage('cpu', 'red')).toBe('あなた(赤鉛筆)の番です');
  });

  it('人同士の手番', () => {
    expect(turnMessage('human', 'blue')).toBe('青鉛筆の番です');
  });

  it('CPUの手番', () => {
    expect(thinkingMessage('blue')).toBe('CPU(青鉛筆)が考え中…');
  });

  it('くじの結果(CPU戦、あなたが先攻)', () => {
    expect(lotteryMessage('cpu', 'human', 'red')).toBe(
      'くじの結果、あなたが先攻(赤鉛筆)です'
    );
  });

  it('くじの結果(CPU戦、CPUが先攻)', () => {
    expect(lotteryMessage('cpu', 'cpu', 'red')).toBe(
      'くじの結果、CPUが先攻(赤鉛筆)です'
    );
  });

  it('人同士のレース開始', () => {
    expect(lotteryMessage('human', 'human', 'red')).toBe('赤鉛筆が先攻です');
  });

  it('行き止まりで負け', () => {
    expect(deadEndResultMessage('red', 'blue')).toBe(
      '赤鉛筆は、どこにも進めません。青鉛筆の勝ちです'
    );
  });

  it('先攻がゴールし、後攻の手番が残っている', () => {
    expect(tieRulePendingMessage('red', 'blue')).toBe(
      '赤鉛筆がゴール! 青鉛筆がこの手でゴールすれば、同着ルールで青鉛筆の勝ちです'
    );
  });
});
