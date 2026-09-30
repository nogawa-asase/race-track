import type { Point } from '../../domain/types';

/** 盤に表示するカメラ(見ている範囲)。正方形で、中心と一辺の長さで表す */
export interface CameraRect {
  readonly cx: number;
  readonly cy: number;
  readonly size: number;
}

/** 盤全体の表示座標(BOARD_MARGIN を含む)の大きさ */
export interface WorldBounds {
  readonly width: number;
  readonly height: number;
}

/** 追従時に表示するワールド座標の一辺。小さいほど寄って見える */
export const FOLLOW_VIEW_SIZE = 20;

/** ピンチで拡大できる限界(フルビューに対する比率) */
const MAX_ZOOM_RATIO = 0.3;

function clampNumber(value: number, min: number, max: number): number {
  if (min > max) return (min + max) / 2;
  return Math.min(Math.max(value, min), max);
}

/**
 * コース全体が収まるカメラ。コースは常に正方形(boardSize.x === boardSize.y)
 * を前提にしている(このゲームの3コースはすべてそう)
 */
export function fullCameraRect(world: WorldBounds): CameraRect {
  const size = Math.max(world.width, world.height);
  return { cx: world.width / 2, cy: world.height / 2, size };
}

/** 指定した点を中心に、追従用の大きさで見るカメラ(盤の外にはみ出さないようクランプする) */
export function followCameraRect(
  world: WorldBounds,
  target: Point
): CameraRect {
  const full = Math.max(world.width, world.height);
  const size = Math.min(FOLLOW_VIEW_SIZE, full);
  return clampCameraRect(world, { cx: target.x, cy: target.y, size });
}

/** カメラが盤の外にはみ出したり、拡大・縮小しすぎたりしないよう補正する */
export function clampCameraRect(
  world: WorldBounds,
  rect: CameraRect
): CameraRect {
  const full = Math.max(world.width, world.height);
  const size = clampNumber(rect.size, full * MAX_ZOOM_RATIO, full);
  const half = size / 2;
  const cx = clampNumber(rect.cx, half, world.width - half);
  const cy = clampNumber(rect.cy, half, world.height - half);
  return { cx, cy, size };
}

/**
 * カメラの矩形を画面に映すための CSS transform(matrix)を作る。
 * SVG の viewBox 自体は盤全体(world)に固定したままにし、中身をまとめた
 * 層に、この transform をかけることでズーム・パンを表現する
 * (viewBox 自体は CSS プロパティではなく Web Animations でアニメーション
 * できないため、CSS transform で表現する)
 */
export function cameraTransform(world: WorldBounds, rect: CameraRect): string {
  const scale = world.width / rect.size;
  const tx = world.width / 2 - scale * rect.cx;
  const ty = world.height / 2 - scale * rect.cy;
  return `matrix(${scale}, 0, 0, ${scale}, ${tx}, ${ty})`;
}
