import { afterEach } from 'vitest';
import { getLang, onLangChange, pick, setLang } from '../../../src/app/i18n';

describe('i18n', () => {
  afterEach(() => {
    setLang('ja');
  });

  it('既定は日本語', () => {
    expect(getLang()).toBe('ja');
    expect(pick('日本語', 'English')).toBe('日本語');
  });

  it('setLang で切り替わり、pick がすぐに新しい言語を返す', () => {
    setLang('en');
    expect(getLang()).toBe('en');
    expect(pick('日本語', 'English')).toBe('English');
  });

  it('同じ言語を指定しても、登録した関数は呼ばれない', () => {
    const calls: string[] = [];
    onLangChange((lang) => calls.push(lang));
    setLang('ja'); // すでに 'ja' なので何も起きない
    expect(calls).toEqual([]);
  });

  it('言語が実際に変わったときだけ、登録したすべての関数が呼ばれる', () => {
    const calls: string[] = [];
    const unsubscribe1 = onLangChange((lang) => calls.push(`a:${lang}`));
    onLangChange((lang) => calls.push(`b:${lang}`));
    setLang('en');
    expect(calls).toEqual(['a:en', 'b:en']);

    unsubscribe1();
    calls.length = 0;
    setLang('ja');
    expect(calls).toEqual(['b:ja']);
  });
});
