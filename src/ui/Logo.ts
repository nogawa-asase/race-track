/**
 * アプリのロゴ(「レーストラック」の文字を、盤の道・芝・方眼を模した
 * 背景で囲んだもの)。h1 として返すので、ページの主見出しの役割も兼ねる。
 * 影は CSS の text-shadow で付ける(複製した文字要素を重ねる方式だと、
 * h1 の実際の文章が「レーストラックレーストラック」になってしまうため)
 */
export function renderLogo(): HTMLHeadingElement {
  const heading = document.createElement('h1');
  heading.className = 'app-logo';

  const road = document.createElement('div');
  road.className = 'app-logo-road';

  const grid = document.createElement('div');
  grid.className = 'app-logo-grid';

  const text = document.createElement('span');
  text.className = 'app-logo-text';
  const red = document.createElement('span');
  red.className = 'app-logo-red';
  red.textContent = 'レース';
  const blue = document.createElement('span');
  blue.className = 'app-logo-blue';
  blue.textContent = 'トラック';
  text.append(red, blue);

  heading.append(road, grid, text);
  return heading;
}
