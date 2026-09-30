const SVG_NS = 'http://www.w3.org/2000/svg';

/** 慣性点と9候補の図(PRD「6-2. ルール説明」の受け入れ条件)。3×3の点で、中央だけ「+」にする */
function renderCandidateDiagram(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 4 4');
  svg.setAttribute('width', '120');
  svg.setAttribute('height', '120');
  svg.setAttribute('class', 'rules-diagram');

  for (let ix = 0; ix < 3; ix++) {
    for (let iy = 0; iy < 3; iy++) {
      const cx = ix + 0.5;
      const cy = iy + 0.5;
      if (ix === 1 && iy === 1) {
        const line1 = document.createElementNS(SVG_NS, 'line');
        line1.setAttribute('x1', String(cx - 0.25));
        line1.setAttribute('y1', String(cy));
        line1.setAttribute('x2', String(cx + 0.25));
        line1.setAttribute('y2', String(cy));
        line1.setAttribute('stroke', '#333');
        line1.setAttribute('stroke-width', '0.08');
        const line2 = document.createElementNS(SVG_NS, 'line');
        line2.setAttribute('x1', String(cx));
        line2.setAttribute('y1', String(cy - 0.25));
        line2.setAttribute('x2', String(cx));
        line2.setAttribute('y2', String(cy + 0.25));
        line2.setAttribute('stroke', '#333');
        line2.setAttribute('stroke-width', '0.08');
        svg.append(line1, line2);
      } else {
        const circle = document.createElementNS(SVG_NS, 'circle');
        circle.setAttribute('cx', String(cx));
        circle.setAttribute('cy', String(cy));
        circle.setAttribute('r', '0.22');
        circle.setAttribute('fill', 'var(--color-red)');
        svg.append(circle);
      }
    }
  }
  return svg;
}

/**
 * ルール説明ダイアログ(PRD「6-2. ルール説明」)。
 * スクロールなしで1画面に収まるよう、短い文章4つ(間に慣性点の図)にまとめる
 */
export class RulesDialog {
  private readonly dialog: HTMLDialogElement;

  constructor(container: HTMLElement) {
    this.dialog = document.createElement('dialog');
    this.dialog.className = 'rules-dialog';

    const body = document.createElement('div');
    body.className = 'rules-dialog-body';

    const title = document.createElement('h2');
    title.textContent = 'ゲームのルール';

    const p1 = document.createElement('p');
    p1.textContent = '車は急に止まることも、加速することもできません。';

    const p2 = document.createElement('p');
    p2.textContent =
      'この世界の車は、1つ目の場所から、今の場所のスピードから、1マス分しか調整できません。';

    const p3 = document.createElement('p');
    p3.textContent =
      '相手より先にゴールしよう。カーブではちゃんとブレーキをかけて!あとハンドルも切ってね!';

    const p4 = document.createElement('p');
    p4.textContent =
      '同じマス目には、車は2台止まれません。だから・・・先行はいつも、先に進んで相手を邪魔できます。それにも関わらず同じターン数でゴールできたら、後攻の勝ちです!';

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.textContent = '閉じる';
    closeButton.addEventListener('click', () => this.dialog.close());

    body.append(title, p1, p2, renderCandidateDiagram(), p3, p4, closeButton);
    this.dialog.append(body);
    container.append(this.dialog);
  }

  /** 開いて、閉じられるまで待つ */
  open(): Promise<void> {
    this.dialog.showModal();
    return new Promise((resolve) => {
      this.dialog.addEventListener('close', () => resolve(), { once: true });
    });
  }
}
