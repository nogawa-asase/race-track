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

/*
 * ダイアログ(確認・メッセージ・ルール説明)を閉じると、開く前に押した
 * ボタンへフォーカスが自動的に戻る。この「自動で戻ったフォーカス」は、
 * ブラウザによっては :focus-visible の判定が一定せず、クリックした
 * だけなのに次にそのボタンを見たときフォーカスの枠が残って見えることが
 * あったため、ダイアログが閉じたら明示的にフォーカスを外す。
 * dialog の close イベントはバブリングしないため、document でも
 * 捕捉フェーズ(true)で拾う
 */
document.addEventListener(
  'close',
  () => {
    (document.activeElement as HTMLElement | null)?.blur();
  },
  true
);

/*
 * 上のダイアログの close 対策とは別に、スマホの一部ブラウザは、
 * タップ(touch)によるフォーカスも :focus-visible と判定することが
 * あり、その場合は theme.css の `button:focus:not(:focus-visible)`
 * による打ち消しが効かず、タップしたボタンにフォーカスの枠が残って
 * 見える。ポインタ操作(マウス・タッチ)でボタンを押した直後に明示的に
 * フォーカスを外すことで、この判定のブレに関係なく枠を残さないように
 * する(キーボード操作でのクリックは pointerup を伴わないため、
 * キーボード操作でのフォーカス表示には影響しない)
 */
document.addEventListener(
  'pointerup',
  (event) => {
    if (!(event.target instanceof Element)) return;
    event.target.closest('button')?.blur();
  },
  true
);

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
  onBackToSettings: () => void controllerRef.current!.backToSettings(),
  onBackToSettingsFromResult: () =>
    controllerRef.current!.backToSettingsFromResult(),
  onRetry: () => void controllerRef.current!.retry(),
  onOpenRules: () => controllerRef.current!.pauseForRules(),
  onCloseRules: () => controllerRef.current!.resumeFromRules(),
});

controllerRef.current = new GameController(view);

view.showSettings(DEFAULT_SETTINGS);
