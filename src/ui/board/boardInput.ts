import type { Candidate, Vec } from '../../domain/types';
import { equals } from '../../domain/vec';

export interface BoardInputHandlers {
  /** 候補・スタート位置が確定された */
  onSelect(target: Vec): void;
  /** プレビューが変わった(候補の再描画に使う。null はプレビューなし) */
  onPreviewChange(target: Vec | null): void;
}

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
 * 盤への入力(クリック・タップ)を監視し、マウスは1回、タッチは2回
 * (同じ点への2回目)で確定する(機能設計書「入力の操作」)。
 * レース中は9候補(`getCandidates`)、スタート位置選び中は置ける点
 * (`getStartPoints`)のどちらかが盤に描かれており、どちらも同じ
 * `data-point-x`/`data-point-y` 属性でクリックされた点を特定する
 *
 * @returns 後片付け(removeEventListener)をする関数
 */
export function attachBoardInput(
  svg: SVGSVGElement,
  getCandidates: () => readonly Candidate[],
  getStartPoints: () => readonly Vec[],
  handlers: BoardInputHandlers
): () => void {
  let previewed: Vec | null = null;

  function setPreview(target: Vec | null): void {
    previewed = target;
    handlers.onPreviewChange(target);
  }

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

    if (event.pointerType === 'touch') {
      if (previewed && equals(previewed, point)) {
        setPreview(null);
        handlers.onSelect(point);
      } else {
        setPreview(point);
      }
    } else {
      // マウス・ペンは1回で確定
      setPreview(null);
      handlers.onSelect(point);
    }
  }

  svg.addEventListener('pointerup', onPointerUp);
  return () => svg.removeEventListener('pointerup', onPointerUp);
}
