import { COURSES } from '../../src/courses';
import { buildCourse } from '../../src/domain/course/buildCourse';
import type { Course } from '../../src/domain/course/types';
import { chooseMove } from '../../src/domain/cpu/chooseMove';
import { chooseStartPoint } from '../../src/domain/cpu/chooseStartPoint';
import { createSeededRandom } from '../../src/domain/cpu/random';
import { applyAction } from '../../src/domain/rules/applyAction';
import { isSelectable } from '../../src/domain/rules/classify';
import { listCandidates } from '../../src/domain/rules/listCandidates';
import { listStartPoints } from '../../src/domain/rules/listStartPoints';
import { settleDeadEnd } from '../../src/domain/rules/judge';
import { buildDistanceTable } from '../../src/domain/table/buildDistanceTable';
import type { DistanceTable } from '../../src/domain/table/types';
import type { CpuLevel, GameState } from '../../src/domain/types';

/** PRDのKPI「CPUの行き詰まりゼロ」の条件 */
const RACES_PER_COMBINATION = 100;
/** これを超えて決着しなければ、無限ループとみなしてテストを失敗させる */
const MOVE_LIMIT = 500;

/** 両者ともCPU(同じ強さ)の、スタート位置選び前の状態を作る */
function createCpuVsCpuGame(
  courseId: (typeof COURSES)[number]['id'],
  level: CpuLevel
): GameState {
  const player = (color: 'red' | 'blue') => ({
    kind: 'cpu' as const,
    cpuLevel: level,
    color,
    position: null,
    velocity: { x: 0, y: 0 },
    trail: [],
    goalRound: null,
  });
  return {
    courseId,
    players: [player('red'), player('blue')],
    phase: 'placing' as const,
    turn: 0,
    round: 0,
    result: null,
  };
}

interface RaceOutcome {
  readonly state: GameState;
  /** 「なし」でない手があったのに、「なし」の手を選んだ回数(0であるべき) */
  readonly avoidableDeadEndChoices: number;
}

/** CPU同士で、決着するまで1レース進める */
function playRace(
  course: Course,
  table: DistanceTable,
  level: CpuLevel,
  seed: number
): RaceOutcome {
  const random = createSeededRandom(seed);
  let state = createCpuVsCpuGame(course.definition.id, level);
  let avoidableDeadEndChoices = 0;

  // スタート位置選び
  while (state.phase === 'placing') {
    const point = chooseStartPoint(
      listStartPoints(state, course),
      table,
      level,
      random
    );
    state = applyAction(state, course, { type: 'place', point });
  }

  // レース
  for (let move = 0; move < MOVE_LIMIT && state.phase === 'racing'; move++) {
    state = settleDeadEnd(state, course);
    if (state.phase === 'finished') {
      break;
    }
    const candidates = listCandidates(state, course);
    const velocity = state.players[state.turn].velocity;
    const accel = chooseMove(candidates, velocity, table, level, random);

    // CPUが、ほかに選択肢があるのに「なし」の手を選んでいないかを確かめる
    const selectable = candidates.filter(isSelectable);
    const hasKnownOption = selectable.some(
      (c) => table.get(c.target, add(velocity, c.accel)) !== null
    );
    const chosen = selectable.find(
      (c) => c.accel.x === accel.x && c.accel.y === accel.y
    )!;
    const chosenDistance = table.get(chosen.target, add(velocity, accel));
    if (hasKnownOption && chosenDistance === null && chosen.status !== 'goal') {
      avoidableDeadEndChoices++;
    }

    state = applyAction(state, course, { type: 'move', accel });
  }

  return { state, avoidableDeadEndChoices };
}

function add(a: { x: number; y: number }, b: { x: number; y: number }) {
  return { x: a.x + b.x, y: a.y + b.y };
}

const LEVELS: readonly CpuLevel[] = ['weak', 'normal', 'strong'];

describe('CPU同士の対戦シミュレーション', () => {
  it.each(
    COURSES.flatMap((definition) =>
      LEVELS.map((level) => [definition, level] as const)
    )
  )(
    '%s(%s) は、100レース以上すべて決着し、CPUが自分から行き止まりに進まない',
    (definition, level) => {
      // Given
      const course = buildCourse(definition);
      const table = buildDistanceTable(course);
      const unfinished: number[] = [];
      let totalAvoidable = 0;

      // When
      for (let i = 0; i < RACES_PER_COMBINATION; i++) {
        const seed = hashSeed(definition.id, level, i);
        const { state, avoidableDeadEndChoices } = playRace(
          course,
          table,
          level,
          seed
        );
        if (state.phase !== 'finished') {
          unfinished.push(seed);
        }
        totalAvoidable += avoidableDeadEndChoices;
      }

      // Then
      expect(unfinished, `決着しなかった種: ${unfinished.join(', ')}`).toEqual(
        []
      );
      expect(totalAvoidable).toBe(0);
    },
    30_000
  );
});

/** コース・強さ・レース番号から、再現できる種を作る */
function hashSeed(courseId: string, level: string, index: number): number {
  const s = `${courseId}:${level}:${index}`;
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) | 0;
  }
  return hash;
}
