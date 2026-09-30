import type { Course } from '../../domain/course/types';
import type { PathElement } from '../../domain/course/types';
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

/**
 * 表示だけのために、パスの最初・最後(スタート手前・ゴール先)を伸ばす。
 * 実際のコース判定(domain)には影響しない、見た目だけの延長
 */
function extendPathForDisplay(
  path: readonly PathElement[],
  startExtension: number,
  endExtension: number
): PathElement[] {
  if (path.length === 0) return [];
  const result = path.map((e) => ({ ...e }));
  const first = result[0];
  if (first.kind === 'line') {
    const dir = normalize({
      x: first.to.x - first.from.x,
      y: first.to.y - first.from.y,
    });
    result[0] = {
      ...first,
      from: {
        x: first.from.x - dir.x * startExtension,
        y: first.from.y - dir.y * startExtension,
      },
    };
  }
  const last = result[result.length - 1];
  if (last.kind === 'line') {
    const dir = normalize({
      x: last.to.x - last.from.x,
      y: last.to.y - last.from.y,
    });
    result[result.length - 1] = {
      ...last,
      to: {
        x: last.to.x + dir.x * endExtension,
        y: last.to.y + dir.y * endExtension,
      },
    };
  }
  return result;
}

function extendCoursePathForDisplay(course: Course): PathElement[] {
  const startExt = roadExtension(
    course,
    { x: -startDirection(course).x, y: -startDirection(course).y },
    START_LABEL.length
  );
  const endExt = roadExtension(
    course,
    goalDirection(course),
    GOAL_LABEL.length
  );
  return extendPathForDisplay(course.path, startExt, endExt);
}

function renderRoad(course: Course): SVGPathElement {
  const path = extendCoursePathForDisplay(course);
  return el('path', {
    d: pathToSvgD(path),
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
      d: pathToSvgD(extendCoursePathForDisplay(course)),
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

const START_LABEL = 'START';
const GOAL_LABEL = 'GOAL';

/** START・GOALの文字の大きさ(コースの太さに応じて決める) */
function labelFontSize(course: Course): number {
  return Math.max(0.7, Math.min(1.4, course.definition.halfWidth * 0.6));
}

/** ラインと文字の間の空き(方眼半マス分) */
const LABEL_GAP = 0.5;

/**
 * ライン→文字の向き(direction)に文字がどれだけはみ出すか(中心から
 * 半分)。direction が横向き(進行方向が左右)なら文字の横幅、縦向きなら
 * 文字の高さが効いてくる
 */
function labelHalfExtentAlong(
  course: Course,
  direction: Vec,
  textLength: number
): number {
  const fontSize = labelFontSize(course);
  const halfTextWidth = (textLength * fontSize * 0.65) / 2;
  const halfTextHeight = fontSize * 0.8;
  return Math.abs(direction.x) >= Math.abs(direction.y)
    ? halfTextWidth
    : halfTextHeight;
}

/**
 * ラインから文字までの距離(中心まで)。ラインと文字の間が方眼半マス分
 * (0.5)くらい空くようにする
 */
function labelDistance(
  course: Course,
  direction: Vec,
  textLength: number
): number {
  return LABEL_GAP + labelHalfExtentAlong(course, direction, textLength);
}

/**
 * スタート手前・ゴール先に見た目だけ道を伸ばす長さ。文字がその延長部分に
 * 収まるよう、ライン→文字の距離に、文字が反対側にもはみ出す分の余裕を足す
 */
function roadExtension(
  course: Course,
  direction: Vec,
  textLength: number
): number {
  return (
    labelDistance(course, direction, textLength) +
    labelHalfExtentAlong(course, direction, textLength) +
    0.3
  );
}

/**
 * スタート・ゴールラインの脇に文字を描く。ラインそのものの上(道の中)では
 * なく、道の外側(direction と逆向き)に、方眼半マス分ほど離して置く
 * (延長した道の上に乗る)。
 *
 * スタート・ゴールが盤の端に近いコースだと、この距離だけずらすと文字が
 * 盤(viewBox)の外にはみ出して欠けて見えることがあるため、文字の幅・高さを
 * (フォントの実測値をもとにした概算で)見積もり、盤の内側に収まるよう
 * 座標をクランプする
 */
function renderLineLabel(
  text: string,
  from: Point,
  to: Point,
  direction: Vec,
  course: Course
): SVGTextElement {
  const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  const fontSize = labelFontSize(course);
  const distance = labelDistance(course, direction, text.length);
  const pos = {
    x: mid.x + direction.x * distance,
    y: mid.y + direction.y * distance,
  };

  const boardWidth = course.definition.boardSize.x - 1 + BOARD_MARGIN * 2;
  const boardHeight = course.definition.boardSize.y - 1 + BOARD_MARGIN * 2;
  const halfTextWidth = (text.length * fontSize * 0.65) / 2;
  const halfTextHeight = fontSize * 0.8;
  pos.x = clamp(pos.x, halfTextWidth, boardWidth - halfTextWidth);
  pos.y = clamp(pos.y, halfTextHeight, boardHeight - halfTextHeight);

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
    renderLineLabel(
      START_LABEL,
      from,
      to,
      { x: -startDirection(course).x, y: -startDirection(course).y },
      course
    )
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
      GOAL_LABEL,
      from,
      to,
      { x: goalDirection(course).x, y: goalDirection(course).y },
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
