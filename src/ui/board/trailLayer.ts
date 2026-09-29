import type { GameState } from '../../domain/types';
import { toDisplay } from './constants';

const SVG_NS = 'http://www.w3.org/2000/svg';

function el<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number>
): SVGElementTagNameMap[K] {
  const e = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) {
    e.setAttribute(key, String(value));
  }
  return e;
}

/**
 * 各プレイヤーの軌跡(通った点を結ぶ線と、点の印)と、現在位置の車を描く。
 * 手番の切り替えのたびに呼び、中身を作り直す(機能設計書「盤の表示」)
 *
 * @param justMovedColor - 直前の手で動いたプレイヤーの色(いなければ null)。
 *   その色の軌跡のうち最後の線分だけ、濃い色から徐々に薄くフェードさせる
 */
export function renderTrailLayer(
  parent: SVGGElement,
  state: GameState,
  justMovedColor: string | null = null
): void {
  const children: SVGElement[] = [];

  for (const player of state.players) {
    if (player.trail.length === 0) {
      continue;
    }
    const color = `var(--color-${player.color})`;
    const points = player.trail.map(toDisplay);

    const segments: SVGLineElement[] = [];
    for (let i = 1; i < points.length; i++) {
      const isLatest =
        i === points.length - 1 && player.color === justMovedColor;
      const line = el('line', {
        x1: points[i - 1].x,
        y1: points[i - 1].y,
        x2: points[i].x,
        y2: points[i].y,
        stroke: color,
        class: `trail-segment trail-${player.color}`,
      });
      segments.push(line);
      if (isLatest) {
        line.animate(
          [
            { stroke: 'var(--color-ink)', strokeWidth: '0.22' },
            { stroke: color, strokeWidth: '0.15' },
          ],
          { duration: 500, easing: 'ease-out', fill: 'forwards' }
        );
      }
    }
    children.push(...segments);

    for (const p of points) {
      children.push(
        el('circle', {
          cx: p.x,
          cy: p.y,
          r: 0.24,
          fill: 'var(--color-ink)',
          class: 'trail-point',
        })
      );
    }

    const current = points[points.length - 1];
    children.push(
      el('circle', {
        cx: current.x,
        cy: current.y,
        r: 0.4,
        fill: color,
        class: `car car-${player.color}`,
        'data-player-color': player.color,
      })
    );
  }

  parent.replaceChildren(...children);
}
