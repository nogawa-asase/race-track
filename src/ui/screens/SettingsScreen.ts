import { COURSES } from '../../courses';
import { onLangChange, pick } from '../../app/i18n';
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
  private readonly opponentLabel: HTMLElement;
  private readonly courseLabel: HTMLElement;
  private readonly cpuLevelLabel: HTMLElement;
  private readonly turnOrderLabel: HTMLElement;
  private readonly alertLabel: HTMLElement;
  private readonly startButton: HTMLButtonElement;
  private readonly rulesButton: HTMLButtonElement;

  constructor(container: HTMLElement, callbacks: SettingsScreenCallbacks) {
    this.container = document.createElement('div');
    this.container.className = 'settings-screen';

    this.opponentSelect = this.buildSelect('opponent', [
      { value: 'cpu' },
      { value: 'human' },
    ]);
    this.courseSelect = this.buildSelect(
      'course',
      COURSES.map((c) => ({ value: c.id }))
    );
    this.cpuLevelSelect = this.buildSelect('cpuLevel', [
      { value: 'weak' },
      { value: 'normal' },
      { value: 'strong' },
    ]);
    this.turnOrderSelect = this.buildSelect('turnOrder', [
      { value: 'lottery' },
      { value: 'first' },
      { value: 'second' },
    ]);
    this.alertCheckbox = document.createElement('input');
    this.alertCheckbox.type = 'checkbox';
    this.alertCheckbox.id = 'alert';

    const opponentField = this.field(this.opponentSelect);
    this.opponentLabel = opponentField.label;
    const courseField = this.field(this.courseSelect);
    this.courseLabel = courseField.label;
    const cpuLevelField = this.field(this.cpuLevelSelect);
    this.cpuLevelField = cpuLevelField.wrapper;
    this.cpuLevelLabel = cpuLevelField.label;
    const turnOrderField = this.field(this.turnOrderSelect);
    this.turnOrderField = turnOrderField.wrapper;
    this.turnOrderLabel = turnOrderField.label;
    const alertField = this.field(this.alertCheckbox);
    this.alertLabel = alertField.label;
    alertField.wrapper.classList.add('field-checkbox');

    this.startButton = document.createElement('button');
    this.startButton.type = 'button';
    this.startButton.addEventListener('click', () =>
      callbacks.onStart(this.currentSettings())
    );
    this.rulesButton = document.createElement('button');
    this.rulesButton.type = 'button';
    this.rulesButton.addEventListener('click', callbacks.onShowRules);
    const buttons = document.createElement('div');
    buttons.className = 'buttons';
    buttons.append(this.startButton, this.rulesButton);

    this.container.append(
      opponentField.wrapper,
      courseField.wrapper,
      this.cpuLevelField,
      this.turnOrderField,
      alertField.wrapper,
      buttons
    );
    container.append(this.container);

    this.opponentSelect.addEventListener('change', () =>
      this.updateVisibility()
    );

    this.relabel();
    onLangChange(() => this.relabel());
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

  /** 表示言語が変わるたびに、選択は保ったまま文言だけ差し替える */
  private relabel(): void {
    this.opponentLabel.textContent = pick('対戦相手', 'Opponent');
    this.courseLabel.textContent = pick('コース', 'Course');
    this.cpuLevelLabel.textContent = pick('CPUの強さ', 'CPU strength');
    this.turnOrderLabel.textContent = pick('先攻後攻', 'Turn order');
    this.alertLabel.textContent = pick(
      '行き止まりのアラート',
      'Dead-end alert'
    );
    this.startButton.textContent = pick('スタート', 'Start');
    this.rulesButton.textContent = pick('ルール説明', 'How to play');

    relabelOptions(this.opponentSelect, {
      cpu: pick('CPU(青)', 'CPU (Blue)'),
      human: pick('人', 'Human'),
    });
    relabelOptions(
      this.courseSelect,
      Object.fromEntries(
        COURSES.map((c) => [
          c.id,
          `${pick(c.name, c.nameEn)}(${difficultyLabel(c.difficulty)}): ${pick(c.description, c.descriptionEn)}`,
        ])
      )
    );
    relabelOptions(this.cpuLevelSelect, {
      weak: pick('よわい', 'Weak'),
      normal: pick('ふつう', 'Normal'),
      strong: pick('つよい', 'Strong'),
    });
    relabelOptions(this.turnOrderSelect, {
      lottery: pick('おまかせ', 'Random'),
      first: pick(
        '先攻: 相手よりも先にスタートできて有利',
        'Go first: an advantage — you start before your opponent'
      ),
      second: pick(
        '後攻: 同着なら後攻が勝ち',
        'Go second: wins ties against the first player'
      ),
    });
  }

  private buildSelect(
    name: string,
    options: readonly { value: string }[]
  ): HTMLSelectElement {
    const select = document.createElement('select');
    select.name = name;
    for (const { value } of options) {
      const option = document.createElement('option');
      option.value = value;
      select.append(option);
    }
    return select;
  }

  private field(control: HTMLElement): {
    wrapper: HTMLElement;
    label: HTMLElement;
  } {
    const wrapper = document.createElement('label');
    wrapper.className = 'field';
    const span = document.createElement('span');
    wrapper.append(span, control);
    return { wrapper, label: span };
  }
}

/** select の中身(option)を、value をキーにした文言の対応表で差し替える */
function relabelOptions(
  select: HTMLSelectElement,
  labels: Record<string, string>
): void {
  for (const option of Array.from(select.options)) {
    const label = labels[option.value];
    if (label !== undefined) {
      option.textContent = label;
    }
  }
}

function difficultyLabel(difficulty: 'easy' | 'normal' | 'hard'): string {
  return pick(
    { easy: 'やさしい', normal: 'ふつう', hard: 'むずかしい' }[difficulty],
    { easy: 'Easy', normal: 'Normal', hard: 'Hard' }[difficulty]
  );
}
