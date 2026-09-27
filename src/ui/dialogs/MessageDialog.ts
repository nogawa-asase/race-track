/** メッセージダイアログ(OK)。機能設計書「showMessage(message): Promise<void>」 */
export class MessageDialog {
  private readonly dialog: HTMLDialogElement;
  private readonly messageEl: HTMLParagraphElement;

  constructor(container: HTMLElement) {
    this.dialog = document.createElement('dialog');
    this.dialog.className = 'message-dialog';
    this.messageEl = document.createElement('p');
    this.messageEl.className = 'dialog-message';

    const buttons = document.createElement('div');
    buttons.className = 'dialog-buttons';
    const okButton = document.createElement('button');
    okButton.type = 'button';
    okButton.textContent = 'OK';
    okButton.addEventListener('click', () => this.dialog.close());
    buttons.append(okButton);

    this.dialog.append(this.messageEl, buttons);
    container.append(this.dialog);
  }

  show(message: string): Promise<void> {
    this.messageEl.textContent = message;
    this.dialog.showModal();
    return new Promise((resolve) => {
      this.dialog.addEventListener('close', () => resolve(), { once: true });
    });
  }
}
