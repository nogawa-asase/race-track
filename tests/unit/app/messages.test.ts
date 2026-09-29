import {
  deadEndResultMessage,
  lotteryMessage,
  thinkingMessage,
  tieRulePendingMessage,
  turnMessage,
} from '../../../src/app/messages';

describe('messages', () => {
  it('人の手番(CPU戦)', () => {
    expect(turnMessage('cpu', 'human', 'red')).toBe('あなた(赤)の番です');
  });

  it('人同士の手番', () => {
    expect(turnMessage('human', 'human', 'blue')).toBe('青の番です');
  });

  it('CPUの手番', () => {
    expect(thinkingMessage('blue')).toBe('CPU(青)が考え中…');
  });

  it('CPUの手番(手番の表示から呼んでも同じ文言)', () => {
    expect(turnMessage('cpu', 'cpu', 'blue')).toBe('CPU(青)が考え中…');
  });

  it('おまかせの結果(CPU戦、あなたが先攻)', () => {
    expect(lotteryMessage('cpu', 'human', 'red')).toBe('あなたが先攻です');
  });

  it('おまかせの結果(CPU戦、CPUが先攻)', () => {
    expect(lotteryMessage('cpu', 'cpu', 'red')).toBe('CPUが先攻です');
  });

  it('人同士のレース開始', () => {
    expect(lotteryMessage('human', 'human', 'red')).toBe('赤が先攻です');
  });

  it('行き止まりで負け(CPU戦)', () => {
    expect(
      deadEndResultMessage(
        'cpu',
        { kind: 'human', color: 'red' },
        { kind: 'cpu', color: 'blue' }
      )
    ).toBe('あなた(赤)は、どこにも進めません。CPU(青)の勝ちです');
  });

  it('行き止まりで負け(人同士)', () => {
    expect(
      deadEndResultMessage(
        'human',
        { kind: 'human', color: 'red' },
        { kind: 'human', color: 'blue' }
      )
    ).toBe('赤は、どこにも進めません。青の勝ちです');
  });

  it('先攻がゴールし、後攻の手番が残っている(人同士)', () => {
    expect(
      tieRulePendingMessage(
        'human',
        { kind: 'human', color: 'red' },
        { kind: 'human', color: 'blue' }
      )
    ).toBe('赤がゴール! 青がこの手でゴールすれば、同着ルールで青の勝ちです');
  });
});
