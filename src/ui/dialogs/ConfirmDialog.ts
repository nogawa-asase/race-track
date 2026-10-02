import { onLangChange, pick } from '../../app/i18n';

/** 確認ダイアログ(はい/いいえ)。機能設計書「confirm(message): Promise<boolean>」 */
export class ConfirmDialog {
  private readonly dialog: HTMLDialogElement;
  private readonly messageEl: HTMLParagraphElement;
  private readonly yesButton: HTMLButtonElement;
  private readonly noButton: HTMLButtonElement;

  constructor(container: HTMLElement) {
    this.dialog = document.createElement('dialog');
    this.dialog.className = 'confirm-dialog';
    this.messageEl = document.createElement('p');
    this.messageEl.className = 'dialog-message';

    const buttons = document.createElement('div');
    buttons.className = 'dialog-buttons';
    this.yesButton = document.createElement('button');
    this.yesButton.type = 'button';
    this.noButton = document.createElement('button');
    this.noButton.type = 'button';
    buttons.append(this.noButton, this.yesButton);

    this.dialog.append(this.messageEl, buttons);
    container.append(this.dialog);

    this.yesButton.addEventListener('click', () => this.dialog.close('yes'));
    this.noButton.addEventListener('click', () => this.dialog.close('no'));

    this.relabel();
    onLangChange(() => this.relabel());
  }

  private relabel(): void {
    this.yesButton.textContent = pick('はい', 'Yes');
    this.noButton.textContent = pick('いいえ', 'No');
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
