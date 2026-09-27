/**
 * アプリの起動処理。
 *
 * 【一時的なデモ】操作パネル・設定画面・GameController との結線ができるまでは、
 * 盤(BoardView)だけを、テスト用のコースと状態で動かして確認する。
 * 次の作業(操作パネル・画面・結線)で、実際のゲームの流れに置き換える
 */
import './ui/styles/theme.css';
import './ui/styles/board.css';
import { hairpin } from './courses/hairpin';
import { buildCourse } from './domain/course/buildCourse';
import { applyAction } from './domain/rules/applyAction';
import { listCandidates } from './domain/rules/listCandidates';
import type { GameState } from './domain/types';
import { BoardView } from './ui/board/BoardView';

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

const boardContainer = document.createElement('div');
app.append(boardContainer);

const course = buildCourse(hairpin);

// デモの見本(?scenario= で切り替える。E2Eテストで、相手がいる候補を
// クリックしても無視されることを確認するために使う)
const scenario = new URLSearchParams(location.search).get('scenario');

let state: GameState = {
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
      // 既定では遠くに置く。scenario=occupied では、先攻の候補の1つ(8,5)に重ねる
      position: scenario === 'occupied' ? { x: 8, y: 5 } : { x: 25, y: 12 },
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

const board = new BoardView(boardContainer, (target) => {
  const candidate = listCandidates(state, course).find(
    (c) => c.target.x === target.x && c.target.y === target.y
  );
  if (!candidate) return;
  state = applyAction(state, course, { type: 'move', accel: candidate.accel });
  status.textContent = `選んだ点: (${target.x}, ${target.y})`;
  board.render(state, listCandidates(state, course));
});

board.setCourse(course);
board.render(state, listCandidates(state, course));
