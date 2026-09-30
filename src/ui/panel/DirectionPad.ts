import { ACCELS_IN_ORDER } from '../../domain/rules/classify';
import type { Candidate, PenColor, Vec } from '../../domain/types';
import { equals } from '../../domain/vec';

/** 候補の記号(盤の候補と同じ考え方。機能設計書「候補の表示」) */
const SYMBOLS: Record<Candidate['status'], string> = {
  ok: '●',
  goal: '★',
  offCourse: '×',
  // コース外と同じ見た目にする(丸に斜め線だと瞬時にわかりにくいため)
  occupied: '×',
};

function isSelectable(candidate: Candidate): boolean {
  return candidate.status === 'ok' || candidate.status === 'goal';
}

/**
 * レース中の3×3の方向パッド(機能設計書「方向パッド」)。
 *
 * 盤の候補とは違い、マウス・タッチにかかわらず常に2段階(1回目でプレビュー、
 * 同じボタンの2回目で確定)で確定する(機能設計書「入力の操作」の表)。
 *
 * この作業では GameController に依存せず、盤(BoardView)のプレビューとは
 * 独立して自分のプレビュー状態を持つ。次の作業(結線)で、GameController が
 * 盤とパッドの両方に同じプレビューを反映させる
 */
export class DirectionPad {
  private readonly container: HTMLElement;
  private readonly buttons: HTMLButtonElement[] = [];
  private candidates: readonly Candidate[] = [];
  private previewedAccel: Vec | null = null;
  private playerColor: PenColor = 'red';

  constructor(
    container: HTMLElement,
    private readonly onSelect: (accel: Vec) => void
  ) {
    this.container = document.createElement('div');
    this.container.className = 'direction-pad';
    for (const accel of ACCELS_IN_ORDER) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.accelX = String(accel.x);
      button.dataset.accelY = String(accel.y);
      // マス目の中央ではなく交点に点を置く(盤の候補と同じデザインにする)。
      // 3×3の交点は、accel(-1〜1)を0〜2のマス目座標に直した位置(0%/50%/100%)
      button.style.left = `${(accel.x + 1) * 50}%`;
      button.style.top = `${(accel.y + 1) * 50}%`;
      button.addEventListener('click', () => this.handleClick(accel));
      this.container.append(button);
      this.buttons.push(button);
    }
    container.append(this.container);
  }

  /**
   * 候補が変わるたび(手番の切り替え)に呼ぶ。プレビューはリセットする
   *
   * @param playerColor - 手番のプレイヤーの色(選べる候補の色に使う)
   */
  render(candidates: readonly Candidate[], playerColor: PenColor): void {
    this.candidates = candidates;
    this.playerColor = playerColor;
    this.previewedAccel = null;
    this.redraw();
  }

  private handleClick(accel: Vec): void {
    const candidate = this.candidates.find((c) => equals(c.accel, accel));
    if (!candidate || !isSelectable(candidate)) {
      return;
    }
    if (this.previewedAccel && equals(this.previewedAccel, accel)) {
      this.previewedAccel = null;
      this.redraw();
      this.onSelect(accel);
    } else {
      this.previewedAccel = accel;
      this.redraw();
    }
  }

  private redraw(): void {
    this.buttons.forEach((button, i) => {
      const candidate = this.candidates[i];
      if (!candidate) {
        button.disabled = true;
        button.textContent = '';
        return;
      }
      button.textContent = SYMBOLS[candidate.status];
      button.disabled = !isSelectable(candidate);
      // 選べる候補は、手番の車の色に合わせる(機能設計書「方向パッド」)
      const colorClass =
        candidate.status === 'ok' ? `color-${this.playerColor}` : '';
      button.className = `candidate-${candidate.status} ${colorClass}`.trim();
      button.classList.toggle(
        'is-previewed',
        this.previewedAccel !== null &&
          equals(this.previewedAccel, candidate.accel)
      );
    });
  }

  destroy(): void {
    this.container.remove();
  }
}
