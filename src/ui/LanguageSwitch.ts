import { getLang, onLangChange, setLang } from '../app/i18n';

/**
 * 言語切り替えボタン(日本語⇔English)。ボタンには「切り替えた先」の
 * 言語名を表示する(今が日本語なら「English」、今が英語なら「日本語」)。
 * ページの常に同じ場所(画面右上)に置き、設定画面・レース画面のどちらからでも押せる
 */
export function renderLanguageSwitch(): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'lang-switch';

  function relabel(): void {
    const next = getLang() === 'ja' ? 'en' : 'ja';
    button.textContent = next === 'en' ? 'English' : '日本語';
    button.lang = next;
  }
  relabel();

  button.addEventListener('click', () => {
    setLang(getLang() === 'ja' ? 'en' : 'ja');
  });
  onLangChange(relabel);

  return button;
}
