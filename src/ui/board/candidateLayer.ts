import type { Candidate, GameState, PenColor, Vec } from '../../domain/types';
import { add, equals } from '../../domain/vec';
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

/** 選べる(ok・goal)候補か */
function isSelectable(candidate: Candidate): boolean {
  return candidate.status === 'ok' || candidate.status === 'goal';
}

/** 候補の記号を作る(機能設計書「候補の表示」) */
function renderMark(candidate: Candidate, big: boolean): SVGElement {
  const p = toDisplay(candidate.target);
  const size = big ? 0.32 : 0.24;

  switch (candidate.status) {
    case 'ok':
      return el('circle', { cx: p.x, cy: p.y, r: size, class: 'mark-ok' });
    case 'goal':
      return renderStar(p, size, 'mark-goal');
    case 'offCourse':
      return renderCross(p, size, 'mark-offcourse');
    case 'occupied':
      return renderOccupied(p, size, 'mark-occupied');
  }
}

function renderStar(center: Vec, size: number, className: string): SVGElement {
  const points: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? size : size * 0.45;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    points.push(
      `${center.x + r * Math.cos(angle)},${center.y + r * Math.sin(angle)}`
    );
  }
  return el('polygon', { points: points.join(' '), class: className });
}

function renderCross(center: Vec, size: number, className: string): SVGElement {
  const g = el('g', { class: className });
  const d = size * 0.7;
  g.append(
    el('line', {
      x1: center.x - d,
      y1: center.y - d,
      x2: center.x + d,
      y2: center.y + d,
    }),
    el('line', {
      x1: center.x - d,
      y1: center.y + d,
      x2: center.x + d,
      y2: center.y - d,
    })
  );
  return g;
}

function renderOccupied(
  center: Vec,
  size: number,
  className: string
): SVGElement {
  const g = el('g', { class: className });
  g.append(
    el('circle', { cx: center.x, cy: center.y, r: size, fill: 'none' }),
    el('line', {
      x1: center.x - size * 0.7,
      y1: center.y - size * 0.7,
      x2: center.x + size * 0.7,
      y2: center.y + size * 0.7,
    })
  );
  return g;
}

/**
 * 慣性点・9候補・プレビューを描く。手番の切り替えのたびに呼ぶ。
 * candidates が null(スタート位置選び中)なら、候補の層は空にする
 *
 * @param preview - プレビュー中の候補の行き先(なければ null)
 */
export function renderCandidateLayer(
  parent: SVGGElement,
  state: GameState,
  candidates: readonly Candidate[] | null,
  preview: Vec | null
): void {
  if (!candidates) {
    parent.replaceChildren();
    return;
  }
  const player = state.players[state.turn];
  const inertiaPoint = toDisplay(add(player.position!, player.velocity));
  const children: SVGElement[] = [];

  // 慣性点の「+」
  const s = 0.18;
  children.push(
    el('line', {
      x1: inertiaPoint.x - s,
      y1: inertiaPoint.y,
      x2: inertiaPoint.x + s,
      y2: inertiaPoint.y,
      class: 'inertia-point',
    }),
    el('line', {
      x1: inertiaPoint.x,
      y1: inertiaPoint.y - s,
      x2: inertiaPoint.x,
      y2: inertiaPoint.y + s,
      class: 'inertia-point',
    })
  );

  // プレビュー中の線分(慣性点や現在位置ではなく、実際の移動元から)
  if (preview) {
    const from = toDisplay(player.position!);
    const to = toDisplay(preview);
    children.push(
      el('line', {
        x1: from.x,
        y1: from.y,
        x2: to.x,
        y2: to.y,
        class: `preview-line preview-${player.color}`,
      })
    );
  }

  for (const candidate of candidates) {
    const isPreviewed = preview ? equals(preview, candidate.target) : false;
    const mark = renderMark(candidate, isPreviewed);
    mark.classList.add(
      'board-candidate',
      `candidate-${candidate.status}`,
      `candidate-color-${player.color}`
    );
    if (!isSelectable(candidate)) {
      mark.classList.add('is-disabled');
    }
    if (isPreviewed) {
      mark.classList.add('is-previewed');
    }
    mark.dataset.pointX = String(candidate.target.x);
    mark.dataset.pointY = String(candidate.target.y);
    children.push(mark);
  }

  parent.replaceChildren(...children);
}

/**
 * スタート位置選び中、置ける点に「選べる」候補と同じ見た目(●・手番の車の色)
 * で丸を描く(機能設計書「入力の操作」の「スタート位置」の行に対応する、
 * 盤への直接クリック・タップのための土台)
 *
 * @param preview - プレビュー中の点(なければ null)
 */
export function renderStartPointLayer(
  parent: SVGGElement,
  points: readonly Vec[],
  preview: Vec | null,
  playerColor: PenColor
): void {
  const children: SVGElement[] = [];
  for (const point of points) {
    const isPreviewed = preview ? equals(preview, point) : false;
    const p = toDisplay(point);
    const mark = el('circle', {
      cx: p.x,
      cy: p.y,
      r: isPreviewed ? 0.32 : 0.24,
      class: 'mark-ok',
    });
    mark.classList.add(
      'board-candidate',
      'candidate-ok',
      `candidate-color-${playerColor}`
    );
    if (isPreviewed) {
      mark.classList.add('is-previewed');
    }
    mark.dataset.pointX = String(point.x);
    mark.dataset.pointY = String(point.y);
    children.push(mark);
  }
  parent.replaceChildren(...children);
}
