import type { Course } from '../../domain/course/types';
import type { Point, Vec } from '../../domain/types';
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

function normalize(v: Vec): Vec {
  const length = Math.hypot(v.x, v.y);
  return length === 0 ? v : { x: v.x / length, y: v.y / length };
}

/** コース序盤(スタート直後)の進行方向の単位ベクトル */
function startDirection(course: Course): Vec {
  const [p0, p1] = course.definition.centerline;
  return normalize({ x: p1.x - p0.x, y: p1.y - p0.y });
}

/** コース終盤(ゴール直前)の進行方向の単位ベクトル */
function goalDirection(course: Course): Vec {
  const points = course.definition.centerline;
  const p0 = points[points.length - 2];
  const p1 = points[points.length - 1];
  return normalize({ x: p1.x - p0.x, y: p1.y - p0.y });
}

/**
 * スタート・ゴールラインの脇に文字を描く。ラインそのものの上ではなく、
 * 道の内側(direction の向き)に少しずらして置く
 */
function renderLineLabel(
  text: string,
  from: Point,
  to: Point,
  direction: Vec,
  course: Course
): SVGTextElement {
  const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  const distance = Math.max(1, course.definition.halfWidth * 0.7);
  const fontSize = Math.max(
    0.7,
    Math.min(1.4, course.definition.halfWidth * 0.6)
  );
  const pos = {
    x: mid.x + direction.x * distance,
    y: mid.y + direction.y * distance,
  };
  const t = el('text', {
    x: pos.x,
    y: pos.y,
    class: 'board-line-label',
    'font-size': fontSize,
  });
  t.setAttribute('text-anchor', 'middle');
  t.setAttribute('dominant-baseline', 'central');
  t.textContent = text;
  return t;
}

function renderStartLine(course: Course): SVGGElement {
  const from = toDisplay(course.startLine.from);
  const to = toDisplay(course.startLine.to);
  const g = el('g', { class: 'board-start-line-group' });
  g.append(
    el('line', {
      x1: from.x,
      y1: from.y,
      x2: to.x,
      y2: to.y,
      class: 'board-start-line',
      stroke: 'var(--color-start-line)',
      'stroke-width': 0.3,
    }),
    renderLineLabel('START', from, to, startDirection(course), course)
  );
  return g;
}

/** ゴールラインを、F1のチェッカーフラッグのような黒白の市松模様にする */
function renderGoalLine(course: Course): SVGGElement {
  const g = el('g', { class: 'board-goal-line-group' });
  const from = toDisplay(course.goalLine.from);
  const to = toDisplay(course.goalLine.to);
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const columns = Math.max(2, Math.round(length / 0.3));
  // コースの太さ(halfWidth)に比例させると、太いコースほど市松模様が
  // ゴールラインの手前まで大きく広がり、まだゴールに達していない車が
  // すでにゴールの中にいるように見えてしまう(実際の判定はゴールラインの
  // 通過・到達だけで、模様の面積とは無関係)。スタートラインと同じような
  // 「太線」に見える程度の、コースの太さに依存しない固定幅にする
  const halfWidth = 0.3;
  const rows = 2;
  const nx = -(to.y - from.y) / length; // 線に直交する向き(進行方向)
  const ny = (to.x - from.x) / length;

  for (let row = 0; row < rows; row++) {
    const d0 = -halfWidth + (halfWidth * 2 * row) / rows;
    const d1 = -halfWidth + (halfWidth * 2 * (row + 1)) / rows;
    for (let col = 0; col < columns; col++) {
      const t0 = col / columns;
      const t1 = (col + 1) / columns;
      const p0 = {
        x: from.x + (to.x - from.x) * t0,
        y: from.y + (to.y - from.y) * t0,
      };
      const p1 = {
        x: from.x + (to.x - from.x) * t1,
        y: from.y + (to.y - from.y) * t1,
      };
      const color = (row + col) % 2 === 0 ? '#000' : '#fff';
      g.append(
        el('polygon', {
          points: [
            `${p0.x + nx * d0},${p0.y + ny * d0}`,
            `${p0.x + nx * d1},${p0.y + ny * d1}`,
            `${p1.x + nx * d1},${p1.y + ny * d1}`,
            `${p1.x + nx * d0},${p1.y + ny * d0}`,
          ].join(' '),
          fill: color,
        })
      );
    }
  }
  g.append(
    renderLineLabel(
      'GOAL',
      from,
      to,
      {
        x: -goalDirection(course).x,
        y: -goalDirection(course).y,
      },
      course
    )
  );
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
