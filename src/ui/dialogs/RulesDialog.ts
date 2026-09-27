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
 * 内容は PRD「ゲームのルール」(準備・1手の進め方・ゴールと勝敗・このゲームで決めたこと)に対応する
 */
export class RulesDialog {
  private readonly dialog: HTMLDialogElement;

  constructor(container: HTMLElement) {
    this.dialog = document.createElement('dialog');
    this.dialog.className = 'rules-dialog';

    const title = document.createElement('h2');
    title.textContent = 'ゲームのルール';

    const prep = document.createElement('section');
    prep.innerHTML = `
      <h3>準備</h3>
      <ul>
        <li>コースの片方の端がスタートライン、もう片方の端がゴールライン</li>
        <li>車は格子点(方眼の線の交点)の上だけを動く</li>
        <li>先攻後攻を決め、手番順にスタートライン上の格子点を1つ選んで車を置く。相手の車がある点は選べない</li>
        <li>はじめの速度は0</li>
      </ul>`;

    const moveSection = document.createElement('section');
    moveSection.innerHTML = `
      <h3>1手の進め方</h3>
      <p>行き先は、次の3つの条件をすべて満たす点から選ぶ。</p>
      <ol>
        <li>コースからはみ出さない(ゴールする手を除く)</li>
        <li>相手の車がいる点には止まれない(衝突禁止)</li>
        <li>加速・減速は1手に1目盛りまで(前の手と同じだけ進んだ点(慣性点)を中心とする3×3の9点(候補)のどれか)</li>
      </ol>`;
    moveSection.append(renderCandidateDiagram());

    const goal = document.createElement('section');
    goal.innerHTML = `
      <h3>ゴールと勝敗</h3>
      <ul>
        <li>1手の線分がゴールラインに到達・通過、またはぴったり止まったらゴール</li>
        <li>先にゴールした方の勝ち。ただし同じ周回で両者がゴールしたら後攻の勝ち(同着ルール)</li>
        <li>自分の手番で9候補がすべて選べないときは、その時点で負け(行き止まり)</li>
      </ul>`;

    const decided = document.createElement('section');
    decided.innerHTML = `
      <h3>このゲームで決めたこと</h3>
      <ul>
        <li>行き止まりは負け(コースの外が理由でも、相手の車に塞がれた場合でも)</li>
        <li>速度0のとき、その場にとどまる手も認める(そのため速度0では行き止まりにならない)</li>
        <li>同着は後攻の勝ち</li>
      </ul>`;

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.textContent = '閉じる';
    closeButton.addEventListener('click', () => this.dialog.close());

    this.dialog.append(title, prep, moveSection, goal, decided, closeButton);
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
