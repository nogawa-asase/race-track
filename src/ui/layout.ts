/**
 * スマホ(縦並びレイアウト)かどうか。layout.css の横並びレイアウトの
 * 境目(幅768px以上・横向き)と同じ条件で判定する
 */
export function isMobileLayout(): boolean {
  return (
    typeof window !== 'undefined' &&
    !window.matchMedia?.('(min-width: 768px) and (orientation: landscape)')
      .matches
  );
}
