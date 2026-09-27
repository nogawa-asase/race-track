import {
  maxSpeedForExtent,
  speedRange,
} from '../../../../src/domain/table/speedRange';

describe('maxSpeedForExtent', () => {
  it.each([
    [33, 7], // extent-1=32: 1+..+7=28<=32, 1+..+8=36>32
    [32, 7], // extent-1=31: 28<=31<36
    [29, 7], // extent-1=28: 1+..+7=28<=28、1+..+8=36>28
    [28, 6], // extent-1=27: 1+..+6=21<=27<28(=1+..+7)
    [10, 3], // extent-1=9: 6<=9<10(=1+..+4)
    [1, 0],
    [0, 0],
  ])('盤の1辺が%i点なら、速度の上限は%i', (extent, expected) => {
    expect(maxSpeedForExtent(extent)).toBe(expected);
  });
});

describe('speedRange', () => {
  it('33×33の盤では、各成分7になる(architecture.mdの数値と一致)', () => {
    expect(speedRange({ x: 33, y: 33 })).toEqual({ vxMax: 7, vyMax: 7 });
  });

  it('x と y で盤の大きさが違えば、別々に計算する', () => {
    expect(speedRange({ x: 33, y: 10 })).toEqual({ vxMax: 7, vyMax: 3 });
  });
});
