/**
 * 表示言語(日本語・英語)の切り替え。
 *
 * 設定と同じくページを開き直すと既定(日本語)に戻る(保存しない)。
 * `pick(ja, en)` は呼ばれるたびに今の言語を見るので、画面側は
 * `onLangChange` で再描画のタイミングだけ受け取ればよい
 */
export type Lang = 'ja' | 'en';

let currentLang: Lang = 'ja';
const listeners = new Set<(lang: Lang) => void>();

/** 今の表示言語 */
export function getLang(): Lang {
  return currentLang;
}

/** 表示言語を切り替える。実際に変わったときだけ、登録した関数すべてに知らせる */
export function setLang(lang: Lang): void {
  if (lang === currentLang) return;
  currentLang = lang;
  for (const listener of listeners) {
    listener(lang);
  }
}

/**
 * 表示言語が変わるたびに呼ばれる関数を登録する(画面側の再描画に使う)。
 * 返り値の関数を呼ぶと登録を解除できる
 */
export function onLangChange(listener: (lang: Lang) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** 今の表示言語に応じて、日本語版・英語版のどちらかを返す */
export function pick<T>(ja: T, en: T): T {
  return currentLang === 'ja' ? ja : en;
}
