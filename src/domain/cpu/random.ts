/**
 * 0以上1未満の乱数を返す。ドメイン層は Math.random を直接使わず、これを引数で受け取る。
 * 本番用の実装(Math.random をそのまま使うもの)は、ドメイン層の外
 * (アプリケーション層。ESLint がドメイン層での Math.random の使用を禁止している)
 * が用意し、呼び出すときに渡す
 */
export interface Random {
  next(): number;
}

/**
 * 種(シード)を固定できる疑似乱数(xorshift32)。テストとシミュレーションで使う。
 * 同じ種からは、常に同じ列が得られる
 */
export function createSeededRandom(seed: number): Random {
  // 0 だと状態がずっと0のままになるため、0にならない値にそろえる
  let state = seed === 0 ? 1 : seed >>> 0;
  return {
    next(): number {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      state >>>= 0;
      return state / 0x100000000;
    },
  };
}
