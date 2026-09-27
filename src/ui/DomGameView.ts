import { lotteryMessage } from '../app/messages';
import type { GameView } from '../app/GameView';
import type { Course } from '../domain/course/types';
import type {
  Candidate,
  GameResult,
  GameSettings,
  GameState,
  Vec,
} from '../domain/types';
import { BoardView } from './board/BoardView';
import { ConfirmDialog } from './dialogs/ConfirmDialog';
import { MessageDialog } from './dialogs/MessageDialog';
import { RulesDialog } from './dialogs/RulesDialog';
import { ControlPanel } from './panel/ControlPanel';
import { listStartPoints } from '../domain/rules/listStartPoints';
import { ResultScreen } from './screens/ResultScreen';
import { SettingsScreen } from './screens/SettingsScreen';

export interface DomGameViewCallbacks {
  onStart(settings: GameSettings): void;
  onPointSelected(point: Vec): void;
  onPadSelected(accel: Vec): void;
  onBackToSettings(): void;
  onBackToSettingsFromResult(): void;
  onRetry(): void;
  onOpenRules(): void;
  onCloseRules(): void;
}

/**
 * `GameView` の実装。盤・操作パネル・設定画面・結果画面・ダイアログを
 * 組み合わせる(機能設計書「GameView」)
 */
export class DomGameView implements GameView {
  private readonly raceScreen: HTMLElement;
  private readonly board: BoardView;
  private readonly panel: ControlPanel;
  private readonly settingsScreen: SettingsScreen;
  private readonly resultScreen: ResultScreen;
  private readonly confirmDialog: ConfirmDialog;
  private readonly messageDialog: MessageDialog;
  private readonly rulesDialog: RulesDialog;
  private opponent: 'cpu' | 'human' = 'cpu';
  private currentCourseId: string | null = null;

  constructor(container: HTMLElement, callbacks: DomGameViewCallbacks) {
    this.settingsScreen = new SettingsScreen(container, {
      onStart: (settings) => {
        this.opponent = settings.opponent;
        callbacks.onStart(settings);
      },
      onShowRules: () => this.openRules(callbacks),
    });

    this.raceScreen = document.createElement('div');
    this.raceScreen.className = 'race-screen';
    this.raceScreen.hidden = true;
    container.append(this.raceScreen);

    this.board = new BoardView(this.raceScreen, callbacks.onPointSelected);
    this.panel = new ControlPanel(this.raceScreen, {
      onCandidateSelect: callbacks.onPadSelected,
      onStartPointSelect: callbacks.onPointSelected,
      onBackToSettings: callbacks.onBackToSettings,
      onShowRules: () => this.openRules(callbacks),
    });
    this.resultScreen = new ResultScreen(this.raceScreen, {
      onRetry: callbacks.onRetry,
      onBackToSettings: callbacks.onBackToSettingsFromResult,
    });

    this.confirmDialog = new ConfirmDialog(container);
    this.messageDialog = new MessageDialog(container);
    this.rulesDialog = new RulesDialog(container);
  }

  showSettings(defaults: GameSettings): void {
    this.opponent = defaults.opponent;
    this.resultScreen.hide();
    this.raceScreen.hidden = true;
    this.settingsScreen.show(defaults);
  }

  showLottery(firstColorOwner: 'human' | 'cpu'): Promise<void> {
    return this.messageDialog.show(
      lotteryMessage('cpu', firstColorOwner, 'red')
    );
  }

  renderBoard(
    state: GameState,
    course: Course,
    candidates: Candidate[] | null
  ): void {
    this.settingsScreen.hide();
    this.resultScreen.hide();
    this.raceScreen.hidden = false;
    if (this.currentCourseId !== course.definition.id) {
      this.board.setCourse(course);
      this.currentCourseId = course.definition.id;
    }
    this.board.render(state, candidates);
    const candidatesOrPoints = candidates ?? listStartPoints(state, course);
    this.panel.render(state, this.opponent, candidatesOrPoints);
  }

  animateMove(player: number, from: Vec, to: Vec): Promise<void> {
    return this.board.animateMove(player, from, to);
  }

  showMessage(message: string): Promise<void> {
    return this.messageDialog.show(message);
  }

  showThinking(visible: boolean): void {
    this.panel.setThinking(visible);
  }

  showResult(result: GameResult, state: GameState): void {
    this.resultScreen.show(result, state);
  }

  confirm(message: string): Promise<boolean> {
    return this.confirmDialog.ask(message);
  }

  private openRules(callbacks: DomGameViewCallbacks): void {
    callbacks.onOpenRules();
    this.rulesDialog.open().then(() => callbacks.onCloseRules());
  }
}
