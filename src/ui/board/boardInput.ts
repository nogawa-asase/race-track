import type { Candidate, Vec } from '../../domain/types';
import { equals } from '../../domain/vec';

export interface BoardInputHandlers {
  /** 候補が確定された */
  onSelect(target: Vec): void;
  /** プレビューが変わった(候補の再描画に使う。null はプレビューなし) */
  onPreviewChange(target: Vec | null): void;
}

function isSelectable(candidate: Candidate): boolean {
  return candidate.status === 'ok' || candidate.status === 'goal';
}

/** クリックされた要素から、候補の要素(data-accel-x/y を持つ祖先)を探す */
function findCandidateElement(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) {
    return null;
  }
  const found = target.closest<HTMLElement>('[data-accel-x]');
  return found;
}

/**
 * 盤への入力(クリック・タップ)を監視し、マウスは1回、タッチは2回
 * (同じ候補への2回目)で確定する(機能設計書「入力の操作」)。
 *
 * @returns 後片付け(removeEventListener)をする関数
 */
export function attachBoardInput(
  svg: SVGSVGElement,
  getCandidates: () => readonly Candidate[],
  handlers: BoardInputHandlers
): () => void {
  let previewed: Vec | null = null;

  function setPreview(target: Vec | null): void {
    previewed = target;
    handlers.onPreviewChange(target);
  }

  function onPointerUp(event: PointerEvent): void {
    const el = findCandidateElement(event.target);
    if (!el) {
      return;
    }
    const accel = {
      x: Number(el.dataset.accelX),
      y: Number(el.dataset.accelY),
    };
    const candidate = getCandidates().find((c) => equals(c.accel, accel));
    if (!candidate || !isSelectable(candidate)) {
      return;
    }

    if (event.pointerType === 'touch') {
      if (previewed && equals(previewed, candidate.target)) {
        setPreview(null);
        handlers.onSelect(candidate.target);
      } else {
        setPreview(candidate.target);
      }
    } else {
      // マウス・ペンは1回で確定
      setPreview(null);
      handlers.onSelect(candidate.target);
    }
  }

  svg.addEventListener('pointerup', onPointerUp);
  return () => svg.removeEventListener('pointerup', onPointerUp);
}
