import { onLangChange, pick } from '../../app/i18n';
import candidateDiagramJa from '../assets/rule-figure-candidates.svg?url';
import candidateDiagramEn from '../assets/rule-figure-candidates-en.svg?url';

/**
 * ルール説明ダイアログ(PRD「6-2. ルール説明」)。
 * 太字の一言+説明の組を3つ(2つ目と3つ目の間に慣性点の図)並べる。
 * スクロールなしで1画面に収まるよう、文章は短くまとめる
 */
export class RulesDialog {
  private readonly dialog: HTMLDialogElement;
  private readonly title: HTMLElement;
  private readonly lead1: HTMLElement;
  private readonly body1: HTMLElement;
  private readonly diagram: HTMLImageElement;
  private readonly lead2: HTMLElement;
  private readonly body2: HTMLElement;
  private readonly lead3: HTMLElement;
  private readonly body3: HTMLElement;
  private readonly closeButton: HTMLButtonElement;

  constructor(container: HTMLElement) {
    this.dialog = document.createElement('dialog');
    this.dialog.className = 'rules-dialog';

    const content = document.createElement('div');
    content.className = 'rules-dialog-body';

    this.title = document.createElement('h2');
    this.lead1 = document.createElement('p');
    this.lead1.className = 'rules-lead';
    this.body1 = document.createElement('p');

    this.diagram = document.createElement('img');
    this.diagram.className = 'rules-diagram';
    this.diagram.width = 320;
    this.diagram.height = 430;

    this.lead2 = document.createElement('p');
    this.lead2.className = 'rules-lead';
    this.body2 = document.createElement('p');
    this.lead3 = document.createElement('p');
    this.lead3.className = 'rules-lead';
    this.body3 = document.createElement('p');

    this.closeButton = document.createElement('button');
    this.closeButton.type = 'button';
    this.closeButton.addEventListener('click', () => this.dialog.close());

    content.append(
      this.title,
      this.lead1,
      this.body1,
      this.diagram,
      this.lead2,
      this.body2,
      this.lead3,
      this.body3,
      this.closeButton
    );
    this.dialog.append(content);
    container.append(this.dialog);

    this.relabel();
    onLangChange(() => this.relabel());
  }

  private relabel(): void {
    this.title.textContent = pick('ゲームのルール', 'How to Play');

    this.lead1.textContent = pick(
      'この車は急に止まることも、加速することもできません。',
      "This car can't stop or speed up suddenly."
    );
    this.body1.textContent = pick(
      'ひとつ前の場所から、今の場所まで来たときのスピードから、1マス分しか調整できません!',
      'From where it was to where it is now, its speed can only change by one square!'
    );

    this.diagram.src = pick(candidateDiagramJa, candidateDiagramEn);
    this.diagram.alt = pick(
      'いきおいの図: ひとつ前の場所から今の場所まで進んだ線と、次に進める9つの候補点、それをつなぐ灰色の矢印',
      'Inertia diagram: the line from the previous position to the current position, the 9 points you can move to next, and the gray arrow connecting them'
    );

    this.lead2.textContent = pick(
      '相手より先にゴールしよう。',
      'Try to reach the goal before your opponent.'
    );
    this.body2.textContent = pick(
      'カーブではちゃんとブレーキをかけて! あとハンドルも切ってね!',
      'Brake properly on curves — and steer, too!'
    );

    this.lead3.textContent = pick(
      '同じマス目には、車は2台止まれません。だから…',
      'Two cars can never share the same square. So…'
    );
    this.body3.textContent = pick(
      '先行はいつも、先に進んで相手を邪魔できます。それにもかかわらず同じターン数でゴールできたら、後攻の勝ちです!',
      'the leader can always move first and block the other car. But if the second player still finishes in the same number of turns, they win!'
    );

    this.closeButton.textContent = pick('閉じる', 'Close');
  }

  /** 開いて、閉じられるまで待つ */
  open(): Promise<void> {
    this.dialog.showModal();
    return new Promise((resolve) => {
      this.dialog.addEventListener('close', () => resolve(), { once: true });
    });
  }
}
