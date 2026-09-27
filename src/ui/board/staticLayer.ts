import type { Course } from '../../domain/course/types';
import type { Vec } from '../../domain/types';
import { BOARD_MARGIN, pathToSvgD, toDisplay } from './constants';

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

function renderGrass(boardSize: Vec): SVGRectElement {
  return el('rect', {
    class: 'board-grass',
    x: 0,
    y: 0,
    width: boardSize.x - 1 + BOARD_MARGIN * 2,
    height: boardSize.y - 1 + BOARD_MARGIN * 2,
    fill: 'var(--color-grass)',
  });
}

/** 盤全体の方眼(格子点を結ぶ縦横の線) */
function renderGrid(boardSize: Vec): SVGGElement {
  const g = el('g', { class: 'board-grid' });
  const width = boardSize.x - 1;
  const height = boardSize.y - 1;
  for (let x = 0; x < boardSize.x; x++) {
    const dx = x + BOARD_MARGIN;
    g.append(
      el('line', {
        x1: dx,
        y1: BOARD_MARGIN,
        x2: dx,
        y2: height + BOARD_MARGIN,
        class: 'board-grid-line',
      })
    );
  }
  for (let y = 0; y < boardSize.y; y++) {
    const dy = y + BOARD_MARGIN;
    g.append(
      el('line', {
        x1: BOARD_MARGIN,
        y1: dy,
        x2: width + BOARD_MARGIN,
        y2: dy,
        class: 'board-grid-line',
      })
    );
  }
  return g;
}

function renderRoad(course: Course): SVGPathElement {
  return el('path', {
    d: pathToSvgD(course.path),
    fill: 'none',
    stroke: 'var(--color-road)',
    'stroke-width': course.definition.halfWidth * 2,
    'stroke-linecap': 'butt',
    class: 'board-road',
  });
}

/** 道の上にも方眼を見せるため、方眼をもう一度、道の範囲だけ重ねて描く */
function renderGridOnRoad(course: Course): SVGGElement {
  const g = el('g', { class: 'board-grid board-grid-on-road' });
  const width = course.definition.boardSize.x - 1;
  const height = course.definition.boardSize.y - 1;
  for (let x = 0; x <= width; x++) {
    const dx = x + BOARD_MARGIN;
    g.append(
      el('line', {
        x1: dx,
        y1: BOARD_MARGIN,
        x2: dx,
        y2: height + BOARD_MARGIN,
        class: 'board-grid-line',
      })
    );
  }
  for (let y = 0; y <= height; y++) {
    const dy = y + BOARD_MARGIN;
    g.append(
      el('line', {
        x1: BOARD_MARGIN,
        y1: dy,
        x2: width + BOARD_MARGIN,
        y2: dy,
        class: 'board-grid-line',
      })
    );
  }
  // 道の形の外を隠す。clipPath は塗りつぶし形状しか扱えず、道はストローク
  // (線)でしか定義していないため、ストロークを描画に反映する mask を使う
  const maskId = `road-mask-${Math.random().toString(36).slice(2)}`;
  const mask = el('mask', { id: maskId });
  mask.append(
    el('rect', {
      x: 0,
      y: 0,
      width: course.definition.boardSize.x - 1 + BOARD_MARGIN * 2,
      height: course.definition.boardSize.y - 1 + BOARD_MARGIN * 2,
      fill: '#000',
    }),
    el('path', {
      d: pathToSvgD(course.path),
      fill: 'none',
      stroke: '#fff',
      'stroke-width': course.definition.halfWidth * 2,
      'stroke-linecap': 'butt',
    })
  );
  g.prepend(mask);
  g.setAttribute('mask', `url(#${maskId})`);
  return g;
}

function renderStartLine(course: Course): SVGLineElement {
  const from = toDisplay(course.startLine.from);
  const to = toDisplay(course.startLine.to);
  return el('line', {
    x1: from.x,
    y1: from.y,
    x2: to.x,
    y2: to.y,
    class: 'board-start-line',
    stroke: 'var(--color-start-line)',
    'stroke-width': 0.3,
  });
}

/** ゴールラインを、白と金を交互に並べた市松模様にする */
function renderGoalLine(course: Course): SVGGElement {
  const g = el('g', { class: 'board-goal-line' });
  const from = toDisplay(course.goalLine.from);
  const to = toDisplay(course.goalLine.to);
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const squares = Math.max(2, Math.round(length / 0.3));
  // コースの太さ(halfWidth)に比例させると、太いコースほど市松模様が
  // ゴールラインの手前まで大きく広がり、まだゴールに達していない車が
  // すでにゴールの中にいるように見えてしまう(実際の判定はゴールラインの
  // 通過・到達だけで、模様の面積とは無関係)。スタートラインと同じような
  // 「太線」に見える程度の、コースの太さに依存しない固定幅にする
  const width = 0.3;
  const nx = -(to.y - from.y) / length; // 線に直交する向き(半幅ぶんの厚み用)
  const ny = (to.x - from.x) / length;

  for (let i = 0; i < squares; i++) {
    const t0 = i / squares;
    const t1 = (i + 1) / squares;
    const p0 = {
      x: from.x + (to.x - from.x) * t0,
      y: from.y + (to.y - from.y) * t0,
    };
    const p1 = {
      x: from.x + (to.x - from.x) * t1,
      y: from.y + (to.y - from.y) * t1,
    };
    const color = i % 2 === 0 ? '#fff' : 'var(--color-goal-gold)';
    g.append(
      el('polygon', {
        points: [
          `${p0.x - nx * width},${p0.y - ny * width}`,
          `${p0.x + nx * width},${p0.y + ny * width}`,
          `${p1.x + nx * width},${p1.y + ny * width}`,
          `${p1.x - nx * width},${p1.y - ny * width}`,
        ].join(' '),
        fill: color,
      })
    );
  }
  return g;
}

/**
 * 芝・方眼・コース・スタートライン・ゴールラインを描き、親要素に追加する。
 * コースを選んだときに1回だけ呼ぶ(機能設計書「盤の表示」)
 */
export function renderStaticLayer(parent: SVGGElement, course: Course): void {
  parent.replaceChildren(
    renderGrass(course.definition.boardSize),
    renderGrid(course.definition.boardSize),
    renderRoad(course),
    renderGridOnRoad(course),
    renderStartLine(course),
    renderGoalLine(course)
  );
}
