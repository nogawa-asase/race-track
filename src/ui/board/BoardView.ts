import type { Course } from '../../domain/course/types';
import type { Candidate, GameState, Point, Vec } from '../../domain/types';
import {
  cameraTransform,
  clampCameraRect,
  followCameraRect,
  fullCameraRect,
} from './camera';
import type { CameraRect, WorldBounds } from './camera';
import { attachBoardInput } from './boardInput';
import {
  renderCandidateLayer,
  renderInertiaArrowLayer,
  renderStartPointLayer,
} from './candidateLayer';
import { BOARD_MARGIN, MOVE_ANIMATION_MS, toDisplay } from './constants';
import { attachPinchZoom } from './pinchZoom';
import { renderStaticLayer } from './staticLayer';
import { renderTrailLayer } from './trailLayer';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** カメラが追従・全体表示へ切り替わるときのアニメーション時間 */
const CAMERA_ANIMATION_MS = 500;
/** コースが表示されてから、全体表示を保つ時間(この後、追従ズームへ移る) */
const RACE_INTRO_HOLD_MS = 3000;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * スマホ(縦並びレイアウト)かどうか。layout.css の横並びレイアウトの
 * 境目(幅768px以上・横向き)と同じ条件で判定する
 */
function isMobileLayout(): boolean {
  return (
    typeof window !== 'undefined' &&
    !window.matchMedia?.('(min-width: 768px) and (orientation: landscape)')
      .matches
  );
}

/**
 * 盤(SVG)の描画と入力をまとめる。`GameView` の一部として、次の作業で
 * `DomGameView` に組み込む。この段階では、単体で使える部品として作る
 */
export class BoardView {
  private readonly svg: SVGSVGElement;
  private readonly cameraGroup: SVGGElement;
  private readonly staticLayer: SVGGElement;
  private readonly arrowLayer: SVGGElement;
  private readonly trailLayer: SVGGElement;
  private readonly candidateLayer: SVGGElement;
  private detachInput: (() => void) | null = null;
  private detachPinchZoom: (() => void) | null = null;
  private latestCandidates: readonly Candidate[] = [];
  private latestStartPoints: readonly Vec[] = [];
  private latestState: GameState | null = null;

  /** 盤全体の表示座標の大きさ(コースを選ぶまでは未確定なのでダミー値) */
  private world: WorldBounds = { width: 1, height: 1 };
  /** スタート位置選び中に追従する先(コースを選ぶまでは未確定なのでダミー値) */
  private startLineCenter: Point = { x: 0, y: 0 };
  private cameraRect: CameraRect = { cx: 0.5, cy: 0.5, size: 1 };
  private cameraAnimation: Animation | null = null;
  /** 'auto' なら自動で追従する。ピンチ操作をすると 'manual' になる */
  private cameraMode: 'auto' | 'manual' = 'auto';
  /** 「まず全体表示」の3秒が経ち、追従ズームを始めたか(レースごとにリセットする) */
  private hasZoomedIn = false;
  private raceIntroTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(container: HTMLElement, onSelect: (target: Vec) => void) {
    this.svg = document.createElementNS(SVG_NS, 'svg');
    this.svg.setAttribute('class', 'board');
    this.cameraGroup = document.createElementNS(SVG_NS, 'g');
    this.cameraGroup.setAttribute('class', 'board-camera');
    this.staticLayer = document.createElementNS(SVG_NS, 'g');
    this.trailLayer = document.createElementNS(SVG_NS, 'g');
    this.candidateLayer = document.createElementNS(SVG_NS, 'g');
    // 慣性点への矢印は、軌跡・車(trailLayer)・候補(candidateLayer)の
    // すべてより手前(最前面)に来るよう、一番最後に置く
    this.arrowLayer = document.createElementNS(SVG_NS, 'g');
    this.cameraGroup.append(
      this.staticLayer,
      this.trailLayer,
      this.candidateLayer,
      this.arrowLayer
    );
    this.svg.append(this.cameraGroup);
    container.append(this.svg);

    const pinchZoom = attachPinchZoom(
      this.svg,
      () => this.world,
      () => this.cameraRect,
      (rect) => this.setCameraRect(rect, false),
      () => {
        this.cameraMode = 'manual';
      }
    );
    this.detachPinchZoom = pinchZoom.detach;

    this.detachInput = attachBoardInput(
      this.svg,
      () => this.latestCandidates,
      () => this.latestStartPoints,
      onSelect,
      pinchZoom.wasMultiTouch
    );
  }

  /** コースを選んだときに1回呼ぶ。静止した層を描き、盤の大きさに合わせる */
  setCourse(course: Course): void {
    const { boardSize } = course.definition;
    this.world = {
      width: boardSize.x - 1 + BOARD_MARGIN * 2,
      height: boardSize.y - 1 + BOARD_MARGIN * 2,
    };
    this.startLineCenter = toDisplay({
      x: (course.startLine.from.x + course.startLine.to.x) / 2,
      y: (course.startLine.from.y + course.startLine.to.y) / 2,
    });
    this.svg.setAttribute(
      'viewBox',
      `0 0 ${this.world.width} ${this.world.height}`
    );
    renderStaticLayer(this.staticLayer, course);
    this.setCameraRect(fullCameraRect(this.world), false);
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
    this.updateCameraForState(state);
  }

  /**
   * カメラ(ズーム・追従)の制御。コースが表示されてから3秒は全体表示を
   * 保ち、そのあと追従ズームへアニメーションで移る(自動追従('auto')の
   * ときだけ)。以降は手番が変わるたびに、今の的(スタート位置選び中は
   * スタートライン中央、レース中は今の手番の車)を中心にズームし直す。
   * ピンチ操作で 'manual' になっている間は、ユーザーの表示を邪魔しない
   * よう何もしない
   */
  private updateCameraForState(state: GameState): void {
    if (this.isFreshRaceStart(state)) {
      // 新しいレースの始まり(「同じ設定でもう一度」でのやり直しも含む)。
      // 前のレースでピンチして 'manual' のままになっていても、新しい
      // レースでは device に応じた既定の状態からやり直す
      // (オートズームの既定オンは、スマホのときだけにする。PCでは
      // 「オートズーム」ボタンを押したときだけ自動追従を始める)
      this.cameraMode = isMobileLayout() ? 'auto' : 'manual';
      this.hasZoomedIn = false;
      if (this.raceIntroTimer) {
        clearTimeout(this.raceIntroTimer);
        this.raceIntroTimer = null;
      }
      if (this.cameraMode === 'auto') {
        this.raceIntroTimer = setTimeout(() => {
          this.raceIntroTimer = null;
          this.hasZoomedIn = true;
          if (this.cameraMode === 'auto' && this.latestState) {
            this.followCurrentTarget(this.latestState, true);
          }
        }, RACE_INTRO_HOLD_MS);
      }
      return;
    }
    if (this.cameraMode !== 'auto' || !this.hasZoomedIn) return;
    this.followCurrentTarget(state, true);
  }

  /** まだ誰もスタート位置を置いていない(=このレースの最初の手番)か */
  private isFreshRaceStart(state: GameState): boolean {
    return state.phase === 'placing' && state.players.every((p) => !p.position);
  }

  /**
   * 追従先(スタート位置選び中はスタートライン中央、レース中は今の
   * 手番の車)にカメラを合わせる
   */
  private followCurrentTarget(state: GameState, animate: boolean): void {
    if (state.phase === 'racing') {
      const player = state.players[state.turn];
      if (!player.position) return;
      this.setCameraRect(
        followCameraRect(this.world, toDisplay(player.position)),
        animate
      );
    } else if (state.phase === 'placing') {
      this.setCameraRect(
        followCameraRect(this.world, this.startLineCenter),
        animate
      );
    }
  }

  /**
   * 「オートズーム」ボタンから呼ぶ。自動追従に戻し、今の的へアニメーション
   * する(「まず全体表示」の3秒を待たず、すぐに寄る)
   */
  resetToAutoFollow(): void {
    this.cameraMode = 'auto';
    this.hasZoomedIn = true;
    if (this.raceIntroTimer) {
      clearTimeout(this.raceIntroTimer);
      this.raceIntroTimer = null;
    }
    if (this.latestState) {
      this.followCurrentTarget(this.latestState, true);
    }
  }

  private setCameraRect(rect: CameraRect, animate: boolean): void {
    const clamped = clampCameraRect(this.world, rect);
    const from = this.cameraRect;
    this.cameraRect = clamped;
    this.cameraAnimation?.cancel();
    this.cameraAnimation = null;
    const toTransform = cameraTransform(this.world, clamped);
    if (!animate || prefersReducedMotion()) {
      this.cameraGroup.style.transform = toTransform;
      return;
    }
    const fromTransform = cameraTransform(this.world, from);
    this.cameraGroup.style.transform = fromTransform;
    this.cameraAnimation = this.cameraGroup.animate(
      [{ transform: fromTransform }, { transform: toTransform }],
      { duration: CAMERA_ANIMATION_MS, easing: 'ease-in-out', fill: 'forwards' }
    );
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
        animate
      );
      return;
    }
    const player = this.latestState.players[this.latestState.turn];
    renderStartPointLayer(
      this.candidateLayer,
      this.latestStartPoints,
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
    this.detachPinchZoom?.();
    if (this.raceIntroTimer) clearTimeout(this.raceIntroTimer);
    this.svg.remove();
  }
}
