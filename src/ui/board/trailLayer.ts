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
 */
export function renderTrailLayer(parent: SVGGElement, state: GameState): void {
  const children: SVGElement[] = [];

  for (const player of state.players) {
    if (player.trail.length === 0) {
      continue;
    }
    const color = `var(--color-${player.color})`;
    const points = player.trail.map(toDisplay);

    if (points.length > 1) {
      children.push(
        el('polyline', {
          points: points.map((p) => `${p.x},${p.y}`).join(' '),
          fill: 'none',
          stroke: color,
          'stroke-width': 0.15,
          class: `trail trail-${player.color}`,
        })
      );
    }
    for (const p of points) {
      children.push(
        el('circle', {
          cx: p.x,
          cy: p.y,
          r: 0.12,
          fill: color,
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
