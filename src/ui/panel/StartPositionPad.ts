import type { Vec } from '../../domain/types';

/**
 * スタート位置選びの操作パネル(機能設計書「スタート位置選びの操作パネル」)。
 * 「←」「→」でプレビューを隣の(置ける)点へ移し、「決定」で確定する
 */
export class StartPositionPad {
  private readonly container: HTMLElement;
  private readonly prevButton: HTMLButtonElement;
  private readonly confirmButton: HTMLButtonElement;
  private readonly nextButton: HTMLButtonElement;
  private points: readonly Vec[] = [];
  private previewIndex = 0;

  constructor(
    container: HTMLElement,
    private readonly onSelect: (point: Vec) => void,
    private readonly onPreviewChange: (point: Vec | null) => void
  ) {
    this.container = document.createElement('div');
    this.container.className = 'start-position-pad';

    this.prevButton = document.createElement('button');
    this.prevButton.type = 'button';
    this.prevButton.className = 'arrow-button';
    this.prevButton.textContent = '←';
    this.prevButton.addEventListener('click', () => this.move(-1));

    this.confirmButton = document.createElement('button');
    this.confirmButton.type = 'button';
    this.confirmButton.textContent = '決定';
    this.confirmButton.addEventListener('click', () => this.confirm());

    this.nextButton = document.createElement('button');
    this.nextButton.type = 'button';
    this.nextButton.className = 'arrow-button';
    this.nextButton.textContent = '→';
    this.nextButton.addEventListener('click', () => this.move(1));

    this.container.append(this.prevButton, this.confirmButton, this.nextButton);
    container.append(this.container);
  }

  /** 置ける点が変わるたび(手番の切り替え)に呼ぶ。最初のプレビューは中央 */
  render(points: readonly Vec[]): void {
    this.points = points;
    this.previewIndex = Math.floor((points.length - 1) / 2);
    this.updateArrowDirection();
    this.redraw();
  }

  /** 現在プレビュー中の点(テスト・確認用) */
  get previewedPoint(): Vec | null {
    return this.points[this.previewIndex] ?? null;
  }

  private move(delta: number): void {
    if (this.points.length === 0) return;
    this.previewIndex = Math.min(
      Math.max(this.previewIndex + delta, 0),
      this.points.length - 1
    );
    this.redraw();
  }

  private confirm(): void {
    const point = this.previewedPoint;
    if (point) {
      this.onSelect(point);
    }
  }

  /**
   * スタートラインの向きに矢印を合わせる(縦のラインなら↑↓、横のラインなら
   * ←→)。並び順の先頭→末尾で座標がどちらへ動くかを見て、見た目の向きと
   * 矢印・previewIndexの増減が一致するようにする
   */
  private updateArrowDirection(): void {
    if (this.points.length < 2) return;
    const first = this.points[0];
    const last = this.points[this.points.length - 1];
    const dx = last.x - first.x;
    const dy = last.y - first.y;
    if (Math.abs(dy) > Math.abs(dx)) {
      this.nextButton.textContent = dy >= 0 ? '↓' : '↑';
      this.prevButton.textContent = dy >= 0 ? '↑' : '↓';
    } else {
      this.nextButton.textContent = dx >= 0 ? '→' : '←';
      this.prevButton.textContent = dx >= 0 ? '←' : '→';
    }
  }

  private redraw(): void {
    this.prevButton.disabled =
      this.points.length === 0 || this.previewIndex <= 0;
    this.nextButton.disabled =
      this.points.length === 0 || this.previewIndex >= this.points.length - 1;
    this.confirmButton.disabled = this.points.length === 0;
    const point = this.previewedPoint;
    this.confirmButton.dataset.previewX = point ? String(point.x) : '';
    this.confirmButton.dataset.previewY = point ? String(point.y) : '';
    this.onPreviewChange(point);
  }

  destroy(): void {
    this.container.remove();
  }
}
