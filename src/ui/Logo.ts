/**
 * アプリのロゴ(「レーストラック」の文字を、盤の道・芝・方眼を模した
 * 背景で囲んだもの)。h1 として返すので、ページの主見出しの役割も兼ねる。
 * 影は CSS の text-shadow で付ける(複製した文字要素を重ねる方式だと、
 * h1 の実際の文章が「レーストラックレーストラック」になってしまうため)
 */
export function renderLogo(): HTMLHeadingElement {
  return renderLogoBase('レース', 'トラック', null);
}

/**
 * ロゴの英語版(「RACE TRACK」)。日本語版と同じ背景・配色・影の処理を
 * 使うが、文字数が多いぶん枠を横に広げ(320→384px)、文字も収まる
 * サイズに縮めている(36px)。タイトルは英語圏の慣習に合わせて大文字にする
 */
export function renderLogoEn(): HTMLHeadingElement {
  return renderLogoBase('RACE', 'TRACK', 'app-logo-en');
}

function renderLogoBase(
  firstWord: string,
  secondWord: string,
  modifierClass: string | null
): HTMLHeadingElement {
  const heading = document.createElement('h1');
  heading.className = modifierClass ? `app-logo ${modifierClass}` : 'app-logo';

  const road = document.createElement('div');
  road.className = 'app-logo-road';

  const grid = document.createElement('div');
  grid.className = 'app-logo-grid';

  const text = document.createElement('span');
  text.className = 'app-logo-text';
  const red = document.createElement('span');
  red.className = 'app-logo-red';
  red.textContent = firstWord;
  const blue = document.createElement('span');
  blue.className = 'app-logo-blue';
  blue.textContent = secondWord;
  text.append(red, modifierClass ? ' ' : '', blue);

  heading.append(road, grid, text);
  return heading;
}
