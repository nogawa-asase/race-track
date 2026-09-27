import { COURSES } from '../../courses';
import type { CpuLevel, GameSettings, TurnOrder } from '../../domain/types';

export interface SettingsScreenCallbacks {
  onStart(settings: GameSettings): void;
  onShowRules(): void;
}

/** 設定画面(機能設計書「設定画面」) */
export class SettingsScreen {
  private readonly container: HTMLElement;
  private readonly opponentSelect: HTMLSelectElement;
  private readonly courseSelect: HTMLSelectElement;
  private readonly cpuLevelField: HTMLElement;
  private readonly cpuLevelSelect: HTMLSelectElement;
  private readonly turnOrderField: HTMLElement;
  private readonly turnOrderSelect: HTMLSelectElement;
  private readonly alertCheckbox: HTMLInputElement;

  constructor(container: HTMLElement, callbacks: SettingsScreenCallbacks) {
    this.container = document.createElement('div');
    this.container.className = 'settings-screen';

    this.opponentSelect = this.buildSelect('opponent', [
      { value: 'cpu', label: 'CPU' },
      { value: 'human', label: '人' },
    ]);
    this.courseSelect = this.buildSelect(
      'course',
      COURSES.map((c) => ({
        value: c.id,
        label: `${c.name}(${difficultyLabel(c.difficulty)}): ${c.description}`,
      }))
    );
    this.cpuLevelSelect = this.buildSelect('cpuLevel', [
      { value: 'weak', label: 'よわい' },
      { value: 'normal', label: 'ふつう' },
      { value: 'strong', label: 'つよい' },
    ]);
    this.turnOrderSelect = this.buildSelect('turnOrder', [
      { value: 'lottery', label: 'くじ' },
      { value: 'first', label: '先攻' },
      { value: 'second', label: '後攻' },
    ]);
    this.alertCheckbox = document.createElement('input');
    this.alertCheckbox.type = 'checkbox';
    this.alertCheckbox.id = 'alert';

    const opponentField = this.field('対戦相手', this.opponentSelect);
    const courseField = this.field('コース', this.courseSelect);
    this.cpuLevelField = this.field('CPUの強さ', this.cpuLevelSelect);
    this.turnOrderField = this.field('先攻後攻', this.turnOrderSelect);
    const alertField = this.field('行き止まりのアラート', this.alertCheckbox);

    const startButton = document.createElement('button');
    startButton.type = 'button';
    startButton.textContent = 'スタート';
    startButton.addEventListener('click', () =>
      callbacks.onStart(this.currentSettings())
    );
    const rulesButton = document.createElement('button');
    rulesButton.type = 'button';
    rulesButton.textContent = 'ルール説明';
    rulesButton.addEventListener('click', callbacks.onShowRules);
    const buttons = document.createElement('div');
    buttons.className = 'buttons';
    buttons.append(startButton, rulesButton);

    this.container.append(
      opponentField,
      courseField,
      this.cpuLevelField,
      this.turnOrderField,
      alertField,
      buttons
    );
    container.append(this.container);

    this.opponentSelect.addEventListener('change', () =>
      this.updateVisibility()
    );
  }

  /** 設定画面を、既定値で表示する */
  show(defaults: GameSettings): void {
    this.opponentSelect.value = defaults.opponent;
    this.courseSelect.value = defaults.courseId;
    this.cpuLevelSelect.value = defaults.cpuLevel;
    this.turnOrderSelect.value = defaults.turnOrder;
    this.alertCheckbox.checked = defaults.alert;
    this.updateVisibility();
    this.container.hidden = false;
  }

  hide(): void {
    this.container.hidden = true;
  }

  private currentSettings(): GameSettings {
    return {
      opponent: this.opponentSelect.value as GameSettings['opponent'],
      courseId: this.courseSelect.value as GameSettings['courseId'],
      cpuLevel: this.cpuLevelSelect.value as CpuLevel,
      turnOrder: this.turnOrderSelect.value as TurnOrder,
      alert: this.alertCheckbox.checked,
    };
  }

  private updateVisibility(): void {
    const isCpu = this.opponentSelect.value === 'cpu';
    this.cpuLevelField.hidden = !isCpu;
    this.turnOrderField.hidden = !isCpu;
  }

  private buildSelect(
    name: string,
    options: readonly { value: string; label: string }[]
  ): HTMLSelectElement {
    const select = document.createElement('select');
    select.name = name;
    for (const { value, label } of options) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      select.append(option);
    }
    return select;
  }

  private field(label: string, control: HTMLElement): HTMLElement {
    const wrapper = document.createElement('label');
    wrapper.className = 'field';
    const span = document.createElement('span');
    span.textContent = label;
    wrapper.append(span, control);
    return wrapper;
  }
}

function difficultyLabel(difficulty: 'easy' | 'normal' | 'hard'): string {
  return { easy: 'やさしい', normal: 'ふつう', hard: 'むずかしい' }[difficulty];
}
