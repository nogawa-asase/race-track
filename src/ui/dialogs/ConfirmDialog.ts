/** 確認ダイアログ(はい/いいえ)。機能設計書「confirm(message): Promise<boolean>」 */
export class ConfirmDialog {
  private readonly dialog: HTMLDialogElement;
  private readonly messageEl: HTMLParagraphElement;

  constructor(container: HTMLElement) {
    this.dialog = document.createElement('dialog');
    this.dialog.className = 'confirm-dialog';
    this.messageEl = document.createElement('p');
    this.messageEl.className = 'dialog-message';

    const buttons = document.createElement('div');
    buttons.className = 'dialog-buttons';
    const yesButton = document.createElement('button');
    yesButton.type = 'button';
    yesButton.textContent = 'はい';
    const noButton = document.createElement('button');
    noButton.type = 'button';
    noButton.textContent = 'いいえ';
    buttons.append(noButton, yesButton);

    this.dialog.append(this.messageEl, buttons);
    container.append(this.dialog);

    yesButton.addEventListener('click', () => this.dialog.close('yes'));
    noButton.addEventListener('click', () => this.dialog.close('no'));
  }

  ask(message: string): Promise<boolean> {
    this.messageEl.textContent = message;
    this.dialog.showModal();
    return new Promise((resolve) => {
      this.dialog.addEventListener(
        'close',
        () => resolve(this.dialog.returnValue === 'yes'),
        { once: true }
      );
    });
  }
}
