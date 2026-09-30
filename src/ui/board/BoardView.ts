import type { Course } from '../../domain/course/types';
import type { Candidate, GameState, Vec } from '../../domain/types';
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
/** レース開始時、全体表示を保ってから追従ズームへ移るまでの時間 */
const RACE_INTRO_HOLD_MS = 1000;

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
  private preview: Vec | null = null;

  /** 盤全体の表示座標の大きさ(コースを選ぶまでは未確定なのでダミー値) */
  private world: WorldBounds = { width: 1, height: 1 };
  private cameraRect: CameraRect = { cx: 0.5, cy: 0.5, size: 1 };
  private cameraAnimation: Animation | null = null;
  /** 'auto' なら手番ごとに自動で追従する。ピンチ操作をすると 'manual' になる */
  private cameraMode: 'auto' | 'manual' = 'auto';
  /** レース開始時の「まず全体表示」を、そのレースで1回だけ行うためのフラグ */
  private hasStartedRaceCamera = false;
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
      {
        onSelect,
        onPreviewChange: (target) => {
          this.preview = target;
          this.redrawCandidates();
        },
      },
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
    this.svg.setAttribute(
      'viewBox',
      `0 0 ${this.world.width} ${this.world.height}`
    );
    renderStaticLayer(this.staticLayer, course);
    this.preview = null;
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
    this.updateCameraForState(state);
  }

  /**
   * カメラ(ズーム・追従)の制御。レース開始時(スタート位置選びから
   * レースへ切り替わった最初の手番)は、全体表示を1秒ほど保ってから
   * 追従ズームへ移る。以降は手番が変わるたびに、自動追従('auto')なら
   * 今の手番の車を中心にズームし直す。ピンチ操作で 'manual' になって
   * いる間は、ユーザーの表示を邪魔しないよう何もしない
   */
  private updateCameraForState(state: GameState): void {
    if (this.isFreshRaceStart(state)) {
      // 新しいレースの始まり(「同じ設定でもう一度」でのやり直しも含む)。
      // 前のレースでピンチして 'manual' のままになっていても、新しい
      // レースでは必ず自動追従から始める
      this.cameraMode = 'auto';
    }
    if (state.phase === 'placing') {
      // スタート位置選び中はまだ車がないので、全体表示のままにする
      this.hasStartedRaceCamera = false;
      if (this.raceIntroTimer) {
        clearTimeout(this.raceIntroTimer);
        this.raceIntroTimer = null;
      }
      if (this.cameraMode === 'auto') {
        this.setCameraRect(fullCameraRect(this.world), true);
      }
      return;
    }
    if (state.phase !== 'racing') return;

    if (!this.hasStartedRaceCamera) {
      this.hasStartedRaceCamera = true;
      // 今は全体表示のまま、少し待ってから追従ズームへ移る
      this.raceIntroTimer = setTimeout(() => {
        this.raceIntroTimer = null;
        if (this.cameraMode === 'auto' && this.latestState) {
          this.followCurrentPlayer(this.latestState, true);
        }
      }, RACE_INTRO_HOLD_MS);
      return;
    }
    if (this.cameraMode === 'auto') {
      this.followCurrentPlayer(state, true);
    }
  }

  /** まだ誰もスタート位置を置いていない(=このレースの最初の手番)か */
  private isFreshRaceStart(state: GameState): boolean {
    return state.phase === 'placing' && state.players.every((p) => !p.position);
  }

  private followCurrentPlayer(state: GameState, animate: boolean): void {
    const player = state.players[state.turn];
    if (!player.position) return;
    const rect = followCameraRect(this.world, toDisplay(player.position));
    this.setCameraRect(rect, animate);
  }

  /**
   * 「オートズーム」ボタンから呼ぶ。自動追従に戻し、今の状態に応じた
   * カメラへアニメーションする(レース中なら今の手番の車、それ以外は全体表示)
   */
  resetToAutoFollow(): void {
    this.cameraMode = 'auto';
    if (!this.latestState) return;
    if (this.latestState.phase === 'racing') {
      this.followCurrentPlayer(this.latestState, true);
    } else {
      this.setCameraRect(fullCameraRect(this.world), true);
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

  /**
   * スタート位置選びのパッド(←→/↑↓)でプレビューが変わったときに呼ぶ。
   * 盤上のマウス・タッチのプレビューと同じ仕組みで、車の点を候補の位置に
   * 表示する
   */
  setPreview(point: Vec | null): void {
    this.preview = point;
    this.redrawCandidates();
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
