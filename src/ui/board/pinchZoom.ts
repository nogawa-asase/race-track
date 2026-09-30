import { clampCameraRect } from './camera';
import type { CameraRect, WorldBounds } from './camera';

interface ScreenPoint {
  readonly x: number;
  readonly y: number;
}

function distance(a: ScreenPoint, b: ScreenPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function midpoint(a: ScreenPoint, b: ScreenPoint): ScreenPoint {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export interface PinchZoomHandle {
  /** このタッチのやり取りで、指2本以上のジェスチャーがあったか
   * (指を離した直後の一定時間は true のままにする。boardInput側が、
   * ピンチの指離しをタップでの確定と誤認しないようにするため) */
  wasMultiTouch(): boolean;
  detach(): void;
}

/**
 * 2本指のピンチ(拡大縮小)・パン(移動)を監視し、盤専用のカメラを操作する。
 * ブラウザ標準のジェスチャーには頼らず自前で行う(レース中の自動追従と
 * 「ピンチで全体表示→オートズームボタンで復帰」を連携させるため)。
 *
 * 前回の指の位置からの増分(距離の比率・中点の移動量)を、そのつど今の
 * カメラへ適用していく方式。ジェスチャー開始時の値だけを基準にする方式より、
 * 拡大の限界(clampCameraRect)に達したときの見た目の破綻が起きにくい
 */
export function attachPinchZoom(
  svg: SVGSVGElement,
  getWorld: () => WorldBounds,
  getRect: () => CameraRect,
  onChange: (rect: CameraRect) => void,
  onGestureStart: () => void
): PinchZoomHandle {
  const pointers = new Map<number, ScreenPoint>();
  let lastDistance = 0;
  let lastMidpoint: ScreenPoint = { x: 0, y: 0 };
  let lastRect: CameraRect | null = null;
  let multiTouch = false;
  let resetTimer: ReturnType<typeof setTimeout> | null = null;

  function activePointers(): ScreenPoint[] {
    return Array.from(pointers.values());
  }

  function onPointerDown(event: PointerEvent): void {
    if (event.pointerType !== 'touch') return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 2) {
      if (resetTimer) {
        clearTimeout(resetTimer);
        resetTimer = null;
      }
      multiTouch = true;
      const [a, b] = activePointers();
      lastDistance = distance(a, b);
      lastMidpoint = midpoint(a, b);
      lastRect = getRect();
      onGestureStart();
    }
  }

  function onPointerMove(event: PointerEvent): void {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size !== 2 || !lastRect) return;

    const [a, b] = activePointers();
    const newDistance = distance(a, b);
    const newMidpoint = midpoint(a, b);
    if (newDistance < 1 || lastDistance < 1) return;

    const svgRect = svg.getBoundingClientRect();
    if (svgRect.width === 0) return;
    const unitsPerPixel = lastRect.size / svgRect.width;

    const scaleRatio = lastDistance / newDistance;
    const dxScreen = newMidpoint.x - lastMidpoint.x;
    const dyScreen = newMidpoint.y - lastMidpoint.y;

    const nextRect = clampCameraRect(getWorld(), {
      cx: lastRect.cx - dxScreen * unitsPerPixel,
      cy: lastRect.cy - dyScreen * unitsPerPixel,
      size: lastRect.size * scaleRatio,
    });

    onChange(nextRect);

    lastDistance = newDistance;
    lastMidpoint = newMidpoint;
    lastRect = nextRect;
  }

  function endTouch(event: PointerEvent): void {
    if (event.pointerType !== 'touch') return;
    pointers.delete(event.pointerId);
    if (pointers.size < 2) {
      lastRect = null;
    }
    if (pointers.size === 0 && multiTouch) {
      // 少し遅らせてリセットする。同じ指離しイベントを処理する
      // boardInput側のタップ確定判定が、リセット前の値を見られるようにする
      resetTimer = setTimeout(() => {
        multiTouch = false;
        resetTimer = null;
      }, 0);
    }
  }

  svg.addEventListener('pointerdown', onPointerDown);
  svg.addEventListener('pointermove', onPointerMove);
  svg.addEventListener('pointerup', endTouch);
  svg.addEventListener('pointercancel', endTouch);

  return {
    wasMultiTouch: () => multiTouch,
    detach: () => {
      svg.removeEventListener('pointerdown', onPointerDown);
      svg.removeEventListener('pointermove', onPointerMove);
      svg.removeEventListener('pointerup', endTouch);
      svg.removeEventListener('pointercancel', endTouch);
      if (resetTimer) clearTimeout(resetTimer);
    },
  };
}
