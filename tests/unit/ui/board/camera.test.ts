import {
  cameraTransform,
  clampCameraRect,
  followCameraRect,
  fullCameraRect,
  FOLLOW_VIEW_SIZE,
} from '../../../../src/ui/board/camera';

const world = { width: 36, height: 36 };

describe('camera', () => {
  it('fullCameraRect: 盤全体の中心・一辺を返す', () => {
    expect(fullCameraRect(world)).toEqual({ cx: 18, cy: 18, size: 36 });
  });

  it('followCameraRect: 指定した点を中心に、追従用の大きさにする', () => {
    const rect = followCameraRect(world, { x: 18, y: 18 });
    expect(rect).toEqual({ cx: 18, cy: 18, size: FOLLOW_VIEW_SIZE });
  });

  it('followCameraRect: 盤の端に近い点は、盤の外にはみ出さないようクランプする', () => {
    const rect = followCameraRect(world, { x: 1, y: 1 });
    const half = FOLLOW_VIEW_SIZE / 2;
    expect(rect.cx).toBe(half);
    expect(rect.cy).toBe(half);
    expect(rect.size).toBe(FOLLOW_VIEW_SIZE);
  });

  it('clampCameraRect: 拡大しすぎ(size が小さすぎる)を防ぐ', () => {
    const rect = clampCameraRect(world, { cx: 18, cy: 18, size: 1 });
    expect(rect.size).toBeGreaterThan(1);
  });

  it('clampCameraRect: 縮小しすぎ(size が盤より大きい)を防ぐ', () => {
    const rect = clampCameraRect(world, { cx: 18, cy: 18, size: 1000 });
    expect(rect.size).toBe(36);
  });

  it('cameraTransform: 盤全体を写すときは等倍(scale=1)になる', () => {
    const transform = cameraTransform(world, fullCameraRect(world));
    expect(transform).toBe('matrix(1, 0, 0, 1, 0, 0)');
  });

  it('cameraTransform: 中心をずらすと、その分だけ平行移動する', () => {
    const rect = { cx: 10, cy: 20, size: 36 };
    const transform = cameraTransform(world, rect);
    // scale = 36/36 = 1, tx = 18 - 1*10 = 8, ty = 18 - 1*20 = -2
    expect(transform).toBe('matrix(1, 0, 0, 1, 8, -2)');
  });

  it('cameraTransform: 半分の大きさで見る(寄る)と、2倍のscaleになる', () => {
    const rect = { cx: 18, cy: 18, size: 18 };
    const transform = cameraTransform(world, rect);
    expect(transform).toBe('matrix(2, 0, 0, 2, -18, -18)');
  });
});
