import { selectByLoss } from '../../../../src/domain/cpu/selectByLoss';
import type { Random } from '../../../../src/domain/cpu/random';

/** 決まった値だけを返す Random(テスト用) */
function fixedRandom(...values: number[]): Random {
  let i = 0;
  return { next: () => values[Math.min(i++, values.length - 1)] };
}

describe('selectByLoss', () => {
  it('最短手数が「なし」の選択肢は、「なし」でない選択肢があれば除く', () => {
    // Given: A は「なし」、B は距離3
    const options = [
      { option: 'A', distance: null },
      { option: 'B', distance: 3 },
    ];

    // When(乱数はどの分岐でも B を選ぶ値)
    const chosen = selectByLoss(options, 'strong', fixedRandom(0.99, 0));

    // Then
    expect(chosen).toBe('B');
  });

  it('すべて「なし」なら、その中から無作為に選ぶ', () => {
    // Given
    const options = [
      { option: 'A', distance: null },
      { option: 'B', distance: null },
      { option: 'C', distance: null },
    ];

    // When: 乱数0.5 → index 1(B)
    const chosen = selectByLoss(options, 'strong', fixedRandom(0.5));

    // Then
    expect(chosen).toBe('B');
  });

  it('「つよい」は、常に損0(最短)の選択肢を選ぶ', () => {
    // Given: A=距離5(損0)、B=距離6(損1)
    const options = [
      { option: 'A', distance: 5 },
      { option: 'B', distance: 6 },
    ];

    // When: 乱数を何に固定しても(strongは確率0なので使われない)
    const chosen = selectByLoss(options, 'strong', fixedRandom(0.0, 0.99));

    // Then
    expect(chosen).toBe('A');
  });

  it('損0の選択肢が複数あれば、その中から無作為に選ぶ', () => {
    // Given: A・B とも距離5(損0)
    const options = [
      { option: 'A', distance: 5 },
      { option: 'B', distance: 5 },
    ];

    // When: 1回目の乱数(確率判定)は使われない(strongは常に外れ扱い)。
    // 2回目の乱数(損0の中からの選択)で index 1(B)
    const chosen = selectByLoss(options, 'strong', fixedRandom(0.99, 0.99));

    // Then
    expect(chosen).toBe('B');
  });

  it('確率に当たれば、損の上限までの選択肢から選ぶ(ふつう: 確率0.2・上限1)', () => {
    // Given: A=距離5(損0)、B=距離6(損1)、C=距離7(損2、上限を超える)
    const options = [
      { option: 'A', distance: 5 },
      { option: 'B', distance: 6 },
      { option: 'C', distance: 7 },
    ];

    // When: 1回目の乱数0.1(確率0.2未満で当たり)、2回目0.99(損1の中から選ぶ→B)
    const chosen = selectByLoss(options, 'normal', fixedRandom(0.1, 0.99));

    // Then: 損2のCは選ばれない
    expect(chosen).toBe('B');
  });

  it('確率に外れれば、損0の選択肢から選ぶ', () => {
    // Given
    const options = [
      { option: 'A', distance: 5 },
      { option: 'B', distance: 6 },
    ];

    // When: 1回目の乱数0.5(確率0.2以上で外れ)
    const chosen = selectByLoss(options, 'normal', fixedRandom(0.5, 0));

    // Then
    expect(chosen).toBe('A');
  });

  it('確率に当たっても、損の上限までの選択肢がなければ、損0を選ぶ', () => {
    // Given: A=距離5(損0)のみ(損1〜3の選択肢がない)
    const options = [{ option: 'A', distance: 5 }];

    // When: 1回目の乱数0.1(よわいの確率0.5未満で当たり)
    const chosen = selectByLoss(options, 'weak', fixedRandom(0.1, 0));

    // Then
    expect(chosen).toBe('A');
  });

  it('選択肢が1つもなければ Error', () => {
    expect(() => selectByLoss([], 'strong', fixedRandom(0))).toThrow(Error);
  });
});
