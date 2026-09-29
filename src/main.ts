/**
 * アプリの起動処理。
 *
 * GameController(画面の流れ・手番の進行)と DomGameView(GameView の実装)を
 * 組み合わせ、設定画面から結果画面までの実際のゲームの流れを動かす。
 */
import './ui/styles/theme.css';
import './ui/styles/logo.css';
import './ui/styles/board.css';
import './ui/styles/panel.css';
import './ui/styles/layout.css';
import './ui/styles/screens.css';
import './ui/styles/dialogs.css';
import { GameController } from './app/GameController';
import type { GameSettings } from './domain/types';
import { DomGameView } from './ui/DomGameView';
import { renderLogo } from './ui/Logo';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) {
  throw new Error('#app が見つかりません');
}

app.append(renderLogo());

/** 機能設計書「設定画面」のデフォルト値 */
const DEFAULT_SETTINGS: GameSettings = {
  opponent: 'cpu',
  courseId: 'hairpin',
  cpuLevel: 'normal',
  turnOrder: 'lottery',
  alert: true,
};

// GameView(DomGameView)は GameController の公開メソッドを呼ぶ必要があるが、
// GameController のコンストラクタは view を要求するため、どちらを先に作っても
// もう一方がまだ無い。参照を後から埋められる箱を経由して結びつける
const controllerRef: { current: GameController | null } = { current: null };

const view = new DomGameView(app, {
  onStart: (settings) => void controllerRef.current!.startGame(settings),
  onPointSelected: (point) => controllerRef.current!.onPointSelected(point),
  onPadSelected: (accel) => controllerRef.current!.onPadSelected(accel),
  onBackToSettings: () => void controllerRef.current!.backToSettings(),
  onBackToSettingsFromResult: () =>
    controllerRef.current!.backToSettingsFromResult(),
  onRetry: () => void controllerRef.current!.retry(),
  onOpenRules: () => controllerRef.current!.pauseForRules(),
  onCloseRules: () => controllerRef.current!.resumeFromRules(),
});

controllerRef.current = new GameController(view);

view.showSettings(DEFAULT_SETTINGS);
