import type { Course } from '../../domain/course/types';
import type { Candidate, GameState, Vec } from '../../domain/types';
import { attachBoardInput } from './boardInput';
import {
  renderCandidateLayer,
  renderInertiaArrowLayer,
  renderStartPointLayer,
} from './candidateLayer';
import { BOARD_MARGIN, MOVE_ANIMATION_MS, toDisplay } from './constants';
import { renderStaticLayer } from './staticLayer';
import { renderTrailLayer } from './trailLayer';

const SVG_NS = 'http://www.w3.org/2000/svg';

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * 盤(SVG)の描画と入力をまとめる。`GameView` の一部として、次の作業で
 * `DomGameView` に組み込む。この段階では、単体で使える部品として作る
 */
export class BoardView {
  private readonly svg: SVGSVGElement;
  private readonly staticLayer: SVGGElement;
  private readonly arrowLayer: SVGGElement;
  private readonly trailLayer: SVGGElement;
  private readonly candidateLayer: SVGGElement;
  private detachInput: (() => void) | null = null;
  private latestCandidates: readonly Candidate[] = [];
  private latestStartPoints: readonly Vec[] = [];
  private latestState: GameState | null = null;
  private preview: Vec | null = null;

  constructor(container: HTMLElement, onSelect: (target: Vec) => void) {
    this.svg = document.createElementNS(SVG_NS, 'svg');
    this.svg.setAttribute('class', 'board');
    this.staticLayer = document.createElementNS(SVG_NS, 'g');
    // 慣性点への矢印は、赤・青の現在位置の点(車)より下に来るよう、
    // 軌跡・車の層(trailLayer)より手前に置く
    this.arrowLayer = document.createElementNS(SVG_NS, 'g');
    this.trailLayer = document.createElementNS(SVG_NS, 'g');
    this.candidateLayer = document.createElementNS(SVG_NS, 'g');
    this.svg.append(
      this.staticLayer,
      this.arrowLayer,
      this.trailLayer,
      this.candidateLayer
    );
    container.append(this.svg);

    this.detachInput = attachBoardInput(
      this.svg,
      () => this.latestCandidates,
      () => this.latestStartPoints,
      {
        onSelect,
        onPreviewChange: (target) => {
          this.preview = target;
          this.redrawCandidates();
        },
      }
    );
  }

  /** コースを選んだときに1回呼ぶ。静止した層を描き、盤の大きさに合わせる */
  setCourse(course: Course): void {
    const { boardSize } = course.definition;
    const size = boardSize.x - 1 + BOARD_MARGIN * 2;
    const sizeY = boardSize.y - 1 + BOARD_MARGIN * 2;
    this.svg.setAttribute('viewBox', `0 0 ${size} ${sizeY}`);
    renderStaticLayer(this.staticLayer, course);
    this.preview = null;
  }

  /**
   * 手番のたびに呼ぶ。軌跡・車・候補(またはスタート位置選び中の置ける点)を
   * 描き直す。`state.phase` が `'racing'` なら `candidatesOrPoints` を9候補
   * として、それ以外(スタート位置選び中)なら置ける点として扱う
   * (機能設計書「入力の操作」の「スタート位置(マウス・タッチ)」に対応する)
   */
  render(
    state: GameState,
    candidatesOrPoints: readonly Candidate[] | readonly Vec[]
  ): void {
    const justMovedColor = this.detectJustMovedColor(state);
    this.latestState = state;
    this.preview = null;
    if (state.phase === 'racing') {
      this.latestCandidates = candidatesOrPoints as readonly Candidate[];
      this.latestStartPoints = [];
    } else {
      this.latestCandidates = [];
      this.latestStartPoints = candidatesOrPoints as readonly Vec[];
    }
    renderTrailLayer(this.trailLayer, state, justMovedColor);
    renderInertiaArrowLayer(this.arrowLayer, state, true);
    this.redrawCandidates(true);
  }

  /**
   * 直前の手で動いたプレイヤーの色を返す(軌跡が1点だけ増えたプレイヤー)。
   * 新しい手番の描画のときだけ、その色の最後の線分をフェードさせる
   */
  private detectJustMovedColor(next: GameState): string | null {
    const prev = this.latestState;
    if (!prev) return null;
    for (let i = 0; i < next.players.length; i++) {
      const prevLength = prev.players[i]?.trail.length ?? 0;
      const nextLength = next.players[i].trail.length;
      if (nextLength === prevLength + 1) {
        return next.players[i].color;
      }
    }
    return null;
  }

  /**
   * @param animate - 中央→残り8候補の順にフェードインさせるか。
   *   新しい手番の描画(`render`)のときだけ true にする
   */
  private redrawCandidates(animate = false): void {
    if (!this.latestState) return;
    if (this.latestState.phase === 'racing') {
      renderCandidateLayer(
        this.candidateLayer,
        this.latestState,
        this.latestCandidates.length > 0 ? this.latestCandidates : null,
        this.preview,
        animate
      );
      return;
    }
    const player = this.latestState.players[this.latestState.turn];
    renderStartPointLayer(
      this.candidateLayer,
      this.latestStartPoints,
      this.preview,
      player.color
    );
  }

  /** 移動アニメーション。完了で解決する Promise を返す */
  animateMove(player: number, from: Vec, to: Vec): Promise<void> {
    const carEl = this.trailLayer.querySelector<SVGCircleElement>(
      `.car-${this.latestState?.players[player].color}`
    );
    if (!carEl || prefersReducedMotion()) {
      return Promise.resolve();
    }
    const fromDisplay = toDisplay(from);
    const toDisplayPoint = toDisplay(to);
    return new Promise((resolve) => {
      const animation = carEl.animate(
        [
          { cx: fromDisplay.x, cy: fromDisplay.y },
          { cx: toDisplayPoint.x, cy: toDisplayPoint.y },
        ],
        { duration: MOVE_ANIMATION_MS, easing: 'ease-in-out', fill: 'forwards' }
      );
      animation.finished.then(() => resolve()).catch(() => resolve());
    });
  }

  /** 後片付け(入力のイベントリスナーを外す) */
  destroy(): void {
    this.detachInput?.();
    this.svg.remove();
  }
}
