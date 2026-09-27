import { afterEach, vi } from 'vitest';
import { GameController } from '../../../src/app/GameController';
import { DEAD_END_WARNING } from '../../../src/app/messages';
import { hairpin } from '../../../src/courses/hairpin';
import { buildCourse } from '../../../src/domain/course/buildCourse';
import { chooseMove } from '../../../src/domain/cpu/chooseMove';
import { chooseStartPoint } from '../../../src/domain/cpu/chooseStartPoint';
import type { Random } from '../../../src/domain/cpu/random';
import { listStartPoints } from '../../../src/domain/rules/listStartPoints';
import { buildDistanceTable } from '../../../src/domain/table/buildDistanceTable';
import type { GameSettings } from '../../../src/domain/types';
import { FakeGameView } from './FakeGameView';
import { buildHairpinTableGz } from '../fixtures/tables';

function gzipResponse(bytes: Uint8Array): Response {
  return {
    ok: true,
    body: new Blob([bytes as unknown as ArrayBuffer]).stream(),
  } as Response;
}

/** すべての表を、事前に生成したファイルから返す fetch のモックにする */
function stubTableFetch(): void {
  const files: Record<string, Buffer> = {
    hairpin: buildHairpinTableGz(),
  };
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const id = url.match(/\/([a-z]+)\.bin\.gz$/)?.[1];
      const bytes = id ? files[id] : undefined;
      if (!bytes) throw new Error(`no fixture for ${url}`);
      return gzipResponse(new Uint8Array(bytes));
    })
  );
}

/** 決まった値だけを返す Random */
function fixedRandom(...values: number[]): Random {
  let i = 0;
  return { next: () => values[Math.min(i++, values.length - 1)] };
}

/** チェーンした非同期処理(setTimeoutの連鎖)が落ち着くまで待つ */
async function settle(times = 20): Promise<void> {
  for (let i = 0; i < times; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

const baseSettings: GameSettings = {
  opponent: 'cpu',
  courseId: 'hairpin',
  cpuLevel: 'strong',
  turnOrder: 'first',
  alert: true,
};

describe('GameController', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('startGame: 先攻の決め方', () => {
    it('CPU戦・くじ: くじの結果を表示してからスタート位置選びに進む', async () => {
      // Given: 乱数0.1(0.5未満)→ 人が先攻
      stubTableFetch();
      const view = new FakeGameView();
      const controller = new GameController(view, fixedRandom(0.1), 0);

      // When
      await controller.startGame({ ...baseSettings, turnOrder: 'lottery' });

      // Then
      expect(view.lotteryShown).toEqual(['human']);
      expect(view.rendered.at(-1)?.state.phase).toBe('placing');
    });

    it('CPU戦・先攻指定: くじを表示せず、スタート位置選びに進む', async () => {
      // Given
      stubTableFetch();
      const view = new FakeGameView();
      const controller = new GameController(view, fixedRandom(0.99), 0);

      // When
      await controller.startGame({ ...baseSettings, turnOrder: 'first' });

      // Then
      expect(view.lotteryShown).toEqual([]);
      expect(view.messages).toEqual([]);
    });

    it('人同士: くじを行わず、先攻のメッセージだけを出す', async () => {
      // Given
      stubTableFetch();
      const view = new FakeGameView();
      const controller = new GameController(view, fixedRandom(0.99), 0);

      // When
      await controller.startGame({ ...baseSettings, opponent: 'human' });

      // Then
      expect(view.lotteryShown).toEqual([]);
      expect(view.messages).toEqual(['赤鉛筆が先攻です']);
    });
  });

  describe('スタート位置選び〜レースの開始', () => {
    it('人が先攻: onPointSelected で置き、CPUが自動で置いてレースが始まる', async () => {
      // Given
      stubTableFetch();
      const view = new FakeGameView();
      const controller = new GameController(view, fixedRandom(0.99), 0);
      await controller.startGame(baseSettings); // turnOrder: 'first' → 人が先攻

      const rendering = view.rendered.at(-1)!;
      expect(rendering.state.phase).toBe('placing');
      const point = rendering.course.startPoints[0];

      // When
      controller.onPointSelected(point);
      await settle();

      // Then: 全員が置き終わり、レースが始まっている
      const last = view.rendered.at(-1)!;
      expect(last.state.phase).toBe('racing');
      expect(last.state.round).toBe(1);
      expect(last.state.players[0].position).toEqual(point);
      expect(last.state.players[1].position).not.toBeNull();
    });

    it('CPUが先攻: 自動で置いてから、人の手番で止まる', async () => {
      // Given
      stubTableFetch();
      const view = new FakeGameView();
      const controller = new GameController(view, fixedRandom(0.99), 0);

      // When
      await controller.startGame({ ...baseSettings, turnOrder: 'second' });

      // Then: CPU(先攻)が自動で置き、人(後攻)の番でまだ placing のまま止まる
      expect(view.thinkingCalls).toEqual([true, false]);
      const last = view.rendered.at(-1)!;
      expect(last.state.phase).toBe('placing');
      expect(last.state.turn).toBe(1);
      expect(last.state.players[0].position).not.toBeNull();
      expect(last.state.players[1].position).toBeNull();
    });
  });

  describe('レース', () => {
    it('人の手を指すと、アニメーションを経て次の手番(CPU)が自動で進む', async () => {
      // Given
      stubTableFetch();
      const view = new FakeGameView();
      const controller = new GameController(view, fixedRandom(0.99), 0);
      await controller.startGame(baseSettings);
      const placing = view.rendered.at(-1)!;
      controller.onPointSelected(placing.course.startPoints[0]);
      await settle();

      const racing = view.rendered.find((r) => r.state.phase === 'racing')!;
      const humanCandidate = racing.candidates!.find(
        (c) => c.status === 'ok' && c.accel.x === 0 && c.accel.y === 0
      )!;

      // When
      controller.onPointSelected(humanCandidate.target);
      await settle();

      // Then: 人の移動アニメーションと、CPUの移動アニメーションの両方が呼ばれた
      expect(view.animations.some((a) => a.player === 0)).toBe(true);
      expect(view.animations.some((a) => a.player === 1)).toBe(true);
      expect(view.thinkingCalls).toContain(true);
    });

    it('選べない候補(方向パッド)は無視される', async () => {
      // Given
      stubTableFetch();
      const view = new FakeGameView();
      const controller = new GameController(view, fixedRandom(0.99), 0);
      await controller.startGame(baseSettings);
      const placing = view.rendered.at(-1)!;
      controller.onPointSelected(placing.course.startPoints[0]);
      await settle();
      const beforeCount = view.rendered.length;

      // When: 明らかに範囲外の加速
      controller.onPadSelected({ x: 5, y: 5 });
      await settle();

      // Then: 何も進行しない(renderBoard が増えない)
      expect(view.rendered.length).toBe(beforeCount);
    });
  });

  describe('決着', () => {
    it('ゴールで決着すると showResult が呼ばれる(強さ「つよい」同士の最適な対戦)', async () => {
      // Given: 人・CPUとも最短手数の表にもとづいて最適に進める(CPUはcontroller内、
      // 人はこのテストの中で chooseMove を呼んで代行する)
      stubTableFetch();
      const view = new FakeGameView();
      const controller = new GameController(view, fixedRandom(0.99), 0);
      await controller.startGame(baseSettings); // opponent: 'cpu', turnOrder: 'first'

      const course = buildCourse(hairpin);
      const table = buildDistanceTable(course);
      const random = fixedRandom(0.99);

      let placing = view.rendered.at(-1)!;
      while (placing.state.phase === 'placing') {
        const point = chooseStartPoint(
          listStartPoints(placing.state, course),
          table,
          'strong',
          random
        );
        controller.onPointSelected(point);
        await settle();
        placing = view.rendered.at(-1)!;
      }

      // When: 人の手番になるたびに、最短手数にもとづく手を代わりに指す
      for (let i = 0; i < 100 && view.results.length === 0; i++) {
        const last = view.rendered.at(-1)!;
        if (last.state.phase === 'finished') break;
        if (last.state.players[last.state.turn].kind === 'human') {
          const velocity = last.state.players[last.state.turn].velocity;
          const accel = chooseMove(
            last.candidates!,
            velocity,
            table,
            'strong',
            random
          );
          controller.onPadSelected(accel);
          await settle();
        } else {
          await settle();
        }
      }

      // Then
      expect(view.results.length).toBe(1);
      expect(['goal', 'tieRule']).toContain(view.results[0].result.reason);
    });

    it('行き止まりで決着すると、予告と結果のメッセージが出て showResult が呼ばれる', async () => {
      // Given: 手で探した「この先どう指しても行き止まりになる」実際の状態
      // (p=(2,19), v=(0,4) から加速(1,1)で (3,24), v=(1,5) へ。ここから9候補が
      // すべてコースの外になることを、buildDistanceTable と同じ判定で確かめてある)
      stubTableFetch();
      const view = new FakeGameView();
      const controller = new GameController(view, fixedRandom(0.99), 0);
      await controller.startGame({ ...baseSettings, opponent: 'human' });

      let placing = view.rendered.at(-1)!;
      while (placing.state.phase === 'placing') {
        controller.onPointSelected(
          placing.course.startPoints[placing.state.turn]
        );
        await settle();
        placing = view.rendered.at(-1)!;
      }
      const racing = view.rendered.at(-1)!.state;

      // 現在の状態を、行き止まりに向かう直前の状態に差し替える(内部状態への
      // アクセスは、この検証専用の抜け道)
      (controller as unknown as { state: typeof racing }).state = {
        ...racing,
        phase: 'racing',
        turn: 0,
        round: 5,
        players: [
          {
            ...racing.players[0],
            position: { x: 2, y: 19 },
            velocity: { x: 0, y: 4 },
            trail: [{ x: 2, y: 19 }],
            goalRound: null,
          },
          {
            ...racing.players[1],
            position: racing.players[1].position!,
            velocity: { x: 0, y: 0 },
            trail: [racing.players[1].position!],
            goalRound: null,
          },
        ],
      };

      // When: 行き止まりに向かう手を指す
      controller.onPadSelected({ x: 1, y: 1 });
      await settle();

      // Then: 予告が出て、Bの番になる
      expect(view.messages).toContain(DEAD_END_WARNING);
      expect(view.rendered.at(-1)?.state.turn).toBe(1);
      expect(view.results.length).toBe(0);

      // When: Bがその場にとどまると、Aの番で行き止まりが確定する
      const bPosition = view.rendered.at(-1)!.state.players[1].position!;
      controller.onPointSelected(bPosition);
      await settle();

      // Then
      expect(view.results.length).toBe(1);
      expect(view.results[0].result.reason).toBe('deadEnd');
      expect(view.results[0].result.winner).toBe(1);
      expect(
        view.messages.some((m) =>
          m.includes('どこにも進めません。青鉛筆の勝ちです')
        )
      ).toBe(true);
    });
  });

  describe('backToSettings・retry', () => {
    it('確認して「はい」なら設定画面に戻る', async () => {
      // Given
      stubTableFetch();
      const view = new FakeGameView();
      const controller = new GameController(view, fixedRandom(0.99), 0);
      await controller.startGame(baseSettings);
      view.queueConfirm(true);

      // When
      await controller.backToSettings();

      // Then
      expect(view.settingsShown).toEqual([baseSettings]);
    });

    it('確認して「いいえ」ならレースを続ける', async () => {
      // Given
      stubTableFetch();
      const view = new FakeGameView();
      const controller = new GameController(view, fixedRandom(0.99), 0);
      await controller.startGame(baseSettings);
      const before = view.rendered.length;
      view.queueConfirm(false);

      // When
      await controller.backToSettings();

      // Then: 設定画面には戻らない
      expect(view.settingsShown).toEqual([]);
      expect(view.rendered.length).toBe(before);
    });

    it('retry: 表を読み込み直さずに、コースの準備からやり直す', async () => {
      // Given
      const fetchMock = vi.fn(async (_url: string) =>
        gzipResponse(new Uint8Array(buildHairpinTableGz()))
      );
      vi.stubGlobal('fetch', fetchMock);
      const view = new FakeGameView();
      const controller = new GameController(view, fixedRandom(0.99), 0);
      await controller.startGame(baseSettings);
      const callsAfterFirstStart = fetchMock.mock.calls.length;

      // When
      await controller.retry();

      // Then
      expect(fetchMock.mock.calls.length).toBe(callsAfterFirstStart);
      expect(view.rendered.at(-1)?.state.phase).toBe('placing');
    });
  });

  describe('エラー処理', () => {
    it('表の読み込みに失敗したら、メッセージを出して設定画面に戻る', async () => {
      // Given
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => ({ ok: false, body: null }) as unknown as Response)
      );
      const view = new FakeGameView();
      const controller = new GameController(view, fixedRandom(0.5), 0);

      // When
      await controller.startGame(baseSettings);

      // Then
      expect(view.messages.some((m) => m.includes('エラーが起きました'))).toBe(
        true
      );
      expect(view.settingsShown).toEqual([baseSettings]);
    });
  });
});
