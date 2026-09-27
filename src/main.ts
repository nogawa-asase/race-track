/**
 * アプリの起動処理。
 *
 * 【一時的なデモ】設定画面・結果画面・GameController との結線ができるまでは、
 * 盤(BoardView)と操作パネル(ControlPanel)を、テスト用のコースと状態で
 * 動かして確認する。次の作業(画面・結線)で、実際のゲームの流れに置き換える
 */
import './ui/styles/theme.css';
import './ui/styles/board.css';
import './ui/styles/panel.css';
import './ui/styles/layout.css';
import { hairpin } from './courses/hairpin';
import { buildCourse } from './domain/course/buildCourse';
import { applyAction } from './domain/rules/applyAction';
import { listCandidates } from './domain/rules/listCandidates';
import { listStartPoints } from './domain/rules/listStartPoints';
import type { GameState } from './domain/types';
import { BoardView } from './ui/board/BoardView';
import { ControlPanel } from './ui/panel/ControlPanel';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) {
  throw new Error('#app が見つかりません');
}

const title = document.createElement('h1');
title.textContent = 'レーストラック';
app.append(title);

const status = document.createElement('p');
status.id = 'status';
app.append(status);

const raceScreen = document.createElement('div');
raceScreen.className = 'race-screen';
app.append(raceScreen);

const course = buildCourse(hairpin);

// デモの見本(?scenario= で切り替える。E2Eテストで使う)
// - occupied: 相手が、先攻の候補の1つ(8,5)に重なる
// - placing: スタート位置選びの画面にする
const scenario = new URLSearchParams(location.search).get('scenario');

let state: GameState =
  scenario === 'placing'
    ? {
        courseId: 'hairpin',
        phase: 'placing',
        turn: 0,
        round: 0,
        result: null,
        players: [
          {
            kind: 'human',
            cpuLevel: null,
            color: 'red',
            position: null,
            velocity: { x: 0, y: 0 },
            trail: [],
            goalRound: null,
          },
          {
            kind: 'human',
            cpuLevel: null,
            color: 'blue',
            position: null,
            velocity: { x: 0, y: 0 },
            trail: [],
            goalRound: null,
          },
        ],
      }
    : {
        courseId: 'hairpin',
        phase: 'racing',
        turn: 0,
        round: 1,
        result: null,
        players: [
          {
            kind: 'human',
            cpuLevel: null,
            color: 'red',
            position: { x: 6, y: 5 },
            velocity: { x: 2, y: 0 },
            trail: [
              { x: 4, y: 5 },
              { x: 6, y: 5 },
            ],
            goalRound: null,
          },
          {
            kind: 'human',
            cpuLevel: null,
            color: 'blue',
            // 既定では遠くに置く。scenario=occupied では候補の1つに重ねる
            position:
              scenario === 'occupied' ? { x: 8, y: 5 } : { x: 25, y: 12 },
            velocity: { x: -1, y: 1 },
            trail: [
              { x: 27, y: 6 },
              { x: 26, y: 9 },
              { x: 25, y: 12 },
            ],
            goalRound: null,
          },
        ],
      };

function currentCandidatesOrPoints() {
  return state.phase === 'racing'
    ? listCandidates(state, course)
    : listStartPoints(state, course);
}

function renderAll(): void {
  board.render(
    state,
    state.phase === 'racing' ? listCandidates(state, course) : null
  );
  panel.render(state, 'human', currentCandidatesOrPoints());
}

function applyMove(accel: { x: number; y: number }): void {
  const candidate = listCandidates(state, course).find(
    (c) => c.accel.x === accel.x && c.accel.y === accel.y
  );
  if (!candidate) return;
  state = applyAction(state, course, { type: 'move', accel });
  status.textContent = `選んだ点: (${candidate.target.x}, ${candidate.target.y})`;
  renderAll();
}

const board = new BoardView(raceScreen, (target) => {
  const candidate = listCandidates(state, course).find(
    (c) => c.target.x === target.x && c.target.y === target.y
  );
  if (candidate) {
    applyMove(candidate.accel);
  }
});

const panel = new ControlPanel(raceScreen, {
  onCandidateSelect: applyMove,
  onStartPointSelect: (point) => {
    state = applyAction(state, course, { type: 'place', point });
    status.textContent = `選んだ点: (${point.x}, ${point.y})`;
    renderAll();
  },
  onBackToSettings: () => {
    status.textContent = '設定に戻る(デモ)';
  },
  onShowRules: () => {
    status.textContent = 'ルール説明(デモ)';
  },
});

board.setCourse(course);
renderAll();
