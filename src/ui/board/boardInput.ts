import type { Candidate, Vec } from '../../domain/types';
import { equals } from '../../domain/vec';

function isSelectable(candidate: Candidate): boolean {
  return candidate.status === 'ok' || candidate.status === 'goal';
}

/** クリックされた要素から、候補・スタート位置の要素(data-point-x/y を持つ祖先)を探す */
function findPointElement(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) {
    return null;
  }
  return target.closest<HTMLElement>('[data-point-x]');
}

/**
 * 盤への入力(クリック・タップ)を監視し、ポインタの種類によらず1回で
 * 確定する(機能設計書「入力の操作」)。
 * レース中は9候補(`getCandidates`)、スタート位置選び中は置ける点
 * (`getStartPoints`)のどちらかが盤に描かれており、どちらも同じ
 * `data-point-x`/`data-point-y` 属性でクリックされた点を特定する
 *
 * (以前はタッチだけ2回タップで確定にしていたが、同じ点への素早い
 * 2回タップがブラウザのダブルタップズームと衝突し、ピンチズームで
 * 拡大した表示が意図せず戻ってしまうことがあったため、マウスと同じ
 * 1回確定に統一した)
 *
 * @param wasMultiTouch - 盤専用のピンチズーム(pinchZoom.ts)から渡す。
 *   直前まで指2本以上のジェスチャーだった場合は true になり、指を離す
 *   pointerup をタップでの確定と誤認しないようにする
 * @returns 後片付け(removeEventListener)をする関数
 */
export function attachBoardInput(
  svg: SVGSVGElement,
  getCandidates: () => readonly Candidate[],
  getStartPoints: () => readonly Vec[],
  onSelect: (target: Vec) => void,
  wasMultiTouch: () => boolean = () => false
): () => void {
  /** クリックされた点が今選べるか(候補なら ok・goal、スタート位置なら常に選べる) */
  function isPointSelectable(point: Vec): boolean {
    const candidates = getCandidates();
    if (candidates.length > 0) {
      const candidate = candidates.find((c) => equals(c.target, point));
      return !!candidate && isSelectable(candidate);
    }
    return getStartPoints().some((p) => equals(p, point));
  }

  function onPointerUp(event: PointerEvent): void {
    if (wasMultiTouch()) {
      return;
    }
    const el = findPointElement(event.target);
    if (!el) {
      return;
    }
    const point = {
      x: Number(el.dataset.pointX),
      y: Number(el.dataset.pointY),
    };
    if (!isPointSelectable(point)) {
      return;
    }
    onSelect(point);
  }

  svg.addEventListener('pointerup', onPointerUp);
  return () => svg.removeEventListener('pointerup', onPointerUp);
}
