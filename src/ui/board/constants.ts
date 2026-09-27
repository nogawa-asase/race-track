import type { PathElement } from '../../domain/course/types';
import type { Point } from '../../domain/types';

/** 盤の余白(目盛り)。候補の記号や車の丸が、盤の端で切れないようにする */
export const BOARD_MARGIN = 1.5;

/**
 * 車の移動アニメーションの時間(PRDの非機能要件)。
 * CPUの「考え中」の時間(THINKING_MS 相当)は、盤ではなく `app/GameController.ts`
 * が持つ(考え中を表示するのは GameController の役目のため。重複させない)
 */
export const MOVE_ANIMATION_MS = 260;

/** 格子点を、余白ぶんずらした表示用の座標にする */
export function toDisplay(p: Point): Point {
  return { x: p.x + BOARD_MARGIN, y: p.y + BOARD_MARGIN };
}

/** パス(直線・円弧の列)を、SVGの path 要素の d 属性にする(表示用の座標で) */
export function pathToSvgD(path: readonly PathElement[]): string {
  let d = '';
  for (const element of path) {
    if (element.kind === 'line') {
      const from = toDisplay(element.from);
      const to = toDisplay(element.to);
      if (d === '') {
        d += `M ${from.x} ${from.y} `;
      }
      d += `L ${to.x} ${to.y} `;
    } else {
      const end = element.startAngle + element.sweep;
      const center = toDisplay(element.center);
      const from = {
        x: center.x + element.radius * Math.cos(element.startAngle),
        y: center.y + element.radius * Math.sin(element.startAngle),
      };
      const to = {
        x: center.x + element.radius * Math.cos(end),
        y: center.y + element.radius * Math.sin(end),
      };
      if (d === '') {
        d += `M ${from.x} ${from.y} `;
      }
      const largeArc = Math.abs(element.sweep) > Math.PI ? 1 : 0;
      const sweepFlag = element.sweep > 0 ? 1 : 0;
      d += `A ${element.radius} ${element.radius} 0 ${largeArc} ${sweepFlag} ${to.x} ${to.y} `;
    }
  }
  return d;
}
