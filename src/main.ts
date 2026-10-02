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
import { getLang, onLangChange, pick } from './app/i18n';
import type { GameSettings } from './domain/types';
import { DomGameView } from './ui/DomGameView';
import { renderLanguageSwitch } from './ui/LanguageSwitch';
import { renderLogo, renderLogoEn } from './ui/Logo';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) {
  throw new Error('#app が見つかりません');
}

/*
 * ボタンがクリック・タップで押されたあと、フォーカスの枠(outline)が
 * 残って見えるのを消す。theme.css の `button:focus:not(:focus-visible)`
 * だけでは、スマホの一部ブラウザがタップによるフォーカスも
 * :focus-visible と判定してしまい効かないことがあるため、JS 側でも
 * 直前の操作がポインタ(マウス・タッチ)かキーボードかを覚えておき、
 * ポインタ操作の直後にボタンがフォーカスされたら明示的に外す。
 *
 * 「フォーカスされた直後」を使うのは、ダイアログを閉じたときに
 * ブラウザが自動的に(開く前に押した)ボタンへフォーカスを戻す挙動も
 * 同じ仕組みで拾うため(dialog の close イベントはバブリングしない上、
 * スマホでは close よりさらに後にフォーカスが移ることがあり、close を
 * 監視するだけでは間に合わないことがあった)。keydown の直後は
 * lastInputWasPointer が false になるので、キーボード操作でのフォーカス
 * 表示(アクセシビリティ)には影響しない
 */
let lastInputWasPointer = false;
document.addEventListener(
  'pointerdown',
  () => (lastInputWasPointer = true),
  true
);
document.addEventListener('keydown', () => (lastInputWasPointer = false), true);
document.addEventListener(
  'focus',
  (event) => {
    if (!lastInputWasPointer) return;
    (event.target as Element | null)?.closest('button')?.blur();
  },
  true
);

/*
 * ロゴは言語が変わるたびに差し替える(日本語版「レーストラック」・
 * 英語版「RACE TRACK」で、文字も枠の大きさも別物のため、文言だけの
 * 差し替えでは済まない)。言語切り替えボタンは画面の同じ場所(右上)に
 * 常に置き、設定画面・レース画面のどちらからでも押せるようにする
 */
let logoEl: HTMLElement = getLang() === 'ja' ? renderLogo() : renderLogoEn();
app.append(logoEl, renderLanguageSwitch());

onLangChange((lang) => {
  const nextLogo = lang === 'ja' ? renderLogo() : renderLogoEn();
  logoEl.replaceWith(nextLogo);
  logoEl = nextLogo;
  document.documentElement.lang = lang;
  document.title = pick('レーストラック', 'Race Track');
});
document.documentElement.lang = getLang();

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
  onRetire: () => void controllerRef.current!.retire(),
});

controllerRef.current = new GameController(view);

view.showSettings(DEFAULT_SETTINGS);
