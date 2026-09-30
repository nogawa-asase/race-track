/**
 * スマホ(幅が狭い、または縦向き)かどうか。レース画面の並びはPC・スマホ
 * どちらも同じ(盤の下にパネル)だが、オートズームはスマホ専用の機能
 * なので、その判定にこの境目(幅768px以上・横向きならPC)を使う
 */
export function isMobileLayout(): boolean {
  return (
    typeof window !== 'undefined' &&
    !window.matchMedia?.('(min-width: 768px) and (orientation: landscape)')
      .matches
  );
}
