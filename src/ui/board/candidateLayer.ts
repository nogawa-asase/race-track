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

/**
 * 記号(見た目)よりひとまわり大きい、タップ判定だけのための透明な円。
 * マス目の間隔(1)に対して、隣の点の判定とじゅうぶん間が空く半径にする
 * (0.45だと隣同士がほぼ接してしまい、誤って隣の点を押してしまうことがあった)
 */
const HIT_AREA_RADIUS = 0.35;

function renderHitArea(point: Vec): SVGCircleElement {
  return el('circle', {
    cx: point.x,
    cy: point.y,
    r: HIT_AREA_RADIUS,
    class: 'board-candidate-hit',
  });
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
      // コース外(×)と同じ見た目にする(丸に斜め線だと、行けない理由が
      // 違うだけと瞬時にわかりにくかったため)
      return renderCross(p, size, 'mark-occupied');
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

const INERTIA_ARROWHEAD_ID = 'inertia-arrowhead';

/** 矢じり(慣性点の矢印の先端)の定義。矢印の line 要素から marker-end で参照する */
function renderArrowheadDefs(): SVGDefsElement {
  const defs = el('defs', {});
  const marker = el('marker', {
    id: INERTIA_ARROWHEAD_ID,
    viewBox: '0 0 10 10',
    refX: 8,
    refY: 5,
    markerWidth: 5,
    markerHeight: 5,
    orient: 'auto-start-reverse',
  });
  marker.append(
    el('path', { d: 'M 0 0 L 10 5 L 0 10 z', class: 'inertia-arrowhead' })
  );
  defs.append(marker);
  return defs;
}

/**
 * 矢印のアニメーションの段階構成(3段階):
 * 1. HOLD: 「Z→A」(前回の移動)の位置で静止し、しっかり見せる
 * 2. SLIDE: 「A→B」(慣性点)の位置へスライドする
 * 3. 候補の出現(中央→残り8点)
 */
const ARROW_HOLD_MS = 750;
const ARROW_SLIDE_MS = 450;
/** 矢印が着地してから、中央の候補(慣性点そのもの)が現れるまでの間 */
const CENTER_REVEAL_DELAY_MS = ARROW_HOLD_MS + ARROW_SLIDE_MS;
/** 中央の候補の後、残り8候補が現れるまでの間 */
const OTHERS_REVEAL_DELAY_MS = CENTER_REVEAL_DELAY_MS + 150;

/**
 * 一つ前の点をZ、現在位置をA、今の勢いのまま進んだ場合の点(慣性点)をB
 * とすると、矢印はまず「Z→A」(前回の移動)の位置でHOLD_MSの間静止し、
 * そのあと「A→B」の位置へSLIDE_MSかけてスライドする
 * (Bは A+velocity で、Z→AもA→Bも同じ velocity ぶんの矢印になるため、
 * 平行移動させるだけで正しい向き・長さのまま A→B に重なる)。
 *
 * 矢印の要素自体は最初から A→B(最終的な位置)に置き、CSS の
 * `transform: translate()` で Z→A の位置にずらしたところから
 * アニメーションで戻す。x1/y1/x2/y2 は SVG の属性であって CSS
 * プロパティではないため Web Animations では実質動かせず、
 * 見た目上アニメーションしない(だけ再生中と報告される)ことがある。
 * `transform` は CSS プロパティとして確実にアニメーションできるため、
 * こちらを使う。`delay` + `fill: 'both'` で、開始前(HOLD中)は最初の
 * キーフレーム(Z→Aの位置)のまま静止させる
 *
 * `animate` が true で、かつ一つ前の点(Z)がある(=速度が0でない)ときだけ
 * スライドさせる。それ以外(最初の1手)は A→B の位置に、動きなしで置く
 */
function renderInertiaArrow(
  prev: Vec | null,
  from: Vec,
  to: Vec,
  animate: boolean
): SVGLineElement {
  const line = el('line', {
    x1: from.x,
    y1: from.y,
    x2: to.x,
    y2: to.y,
    class: 'inertia-arrow',
    'marker-end': `url(#${INERTIA_ARROWHEAD_ID})`,
  });
  if (animate && prev) {
    const dx = prev.x - from.x;
    const dy = prev.y - from.y;
    line.animate(
      [
        { transform: `translate(${dx}px, ${dy}px)` },
        { transform: 'translate(0px, 0px)' },
      ],
      {
        duration: ARROW_SLIDE_MS,
        delay: ARROW_HOLD_MS,
        easing: 'ease-out',
        fill: 'both',
      }
    );
  }
  return line;
}

/**
 * 現在位置から慣性点への矢印だけを描く、専用の層。軌跡・車・候補の
 * すべての層より手前(最前面)に置く。
 * 手番が変わるたびに呼ぶ(プレビュー変更では呼ばない。矢印はプレビュー
 * に関係しないため)
 */
export function renderInertiaArrowLayer(
  parent: SVGGElement,
  state: GameState,
  animate: boolean
): void {
  if (state.phase !== 'racing') {
    parent.replaceChildren();
    return;
  }
  const player = state.players[state.turn];
  const from = toDisplay(player.position!);
  const to = toDisplay(add(player.position!, player.velocity));
  const trail = player.trail;
  const prev = trail.length >= 2 ? toDisplay(trail[trail.length - 2]) : null;

  parent.replaceChildren(
    renderArrowheadDefs(),
    renderInertiaArrow(prev, from, to, animate)
  );
}

/**
 * 手番が変わった直後、候補をフェードインさせる。矢印がAB(慣性点)に
 * 着地したタイミングでまず中央(加速なし)の候補、その少し後に残り8候補
 * が現れるようにする
 */
function revealCandidateMark(mark: SVGElement, isCenter: boolean): void {
  const delay = isCenter ? CENTER_REVEAL_DELAY_MS : OTHERS_REVEAL_DELAY_MS;
  mark.animate([{ opacity: 0 }, { opacity: 1 }], {
    duration: 150,
    delay,
    easing: 'ease-out',
    fill: 'both',
  });
}

/**
 * 9候補・プレビューを描く。手番の切り替えのたびに呼ぶ。
 * candidates が null(スタート位置選び中)なら、候補の層は空にする
 * (慣性点への矢印は、別の層に `renderInertiaArrowLayer` で描く)
 *
 * @param preview - プレビュー中の候補の行き先(なければ null)
 * @param animateReveal - 中央→残り8候補の順にフェードインさせるか。
 *   新しい手番の描画のときだけ true にする(プレビュー変更だけの再描画で
 *   毎回フェードし直されると煩わしいため)
 */
export function renderCandidateLayer(
  parent: SVGGElement,
  state: GameState,
  candidates: readonly Candidate[] | null,
  preview: Vec | null,
  animateReveal: boolean
): void {
  if (!candidates) {
    parent.replaceChildren();
    return;
  }
  const player = state.players[state.turn];
  const trail = player.trail;
  const hasPrevPoint = trail.length >= 2;
  const children: SVGElement[] = [];

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

    // タップ判定は記号そのものより広くする(記号の見た目は変えない)
    if (isSelectable(candidate)) {
      const hit = renderHitArea(toDisplay(candidate.target));
      hit.dataset.pointX = String(candidate.target.x);
      hit.dataset.pointY = String(candidate.target.y);
      children.push(hit);
    }
    children.push(mark);

    if (animateReveal && hasPrevPoint) {
      const isCenter = candidate.accel.x === 0 && candidate.accel.y === 0;
      revealCandidateMark(mark, isCenter);
    }
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
      // is-previewed は E2E テストがプレビュー判定に使うため残すが、
      // レース中の候補プレビューと違い、スタート位置選びでは影
      // (is-previewedのdrop-shadow)を付けない(is-start-previewで打ち消す)。
      // 大きさの違いだけでプレビュー中と分かるようにする
      mark.classList.add('is-previewed', 'is-start-preview');
    }
    mark.dataset.pointX = String(point.x);
    mark.dataset.pointY = String(point.y);

    // タップ判定は記号そのものより広くする(記号の見た目は変えない)
    const hit = renderHitArea(p);
    hit.dataset.pointX = String(point.x);
    hit.dataset.pointY = String(point.y);
    children.push(hit, mark);
  }
  parent.replaceChildren(...children);
}
