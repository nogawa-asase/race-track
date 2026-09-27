import type { CourseDefinition } from '../domain/course/types';

/**
 * ヘアピン(やさしい)。幅広で、大きな折り返し(ヘアピン)が2つ。
 * 右へ進み、右端で折り返して左へ、左端で折り返してまた右へ。
 * 脚の間隔は10、道幅は6なので、脚の間の芝は4
 */
export const hairpin: CourseDefinition = {
  id: 'hairpin',
  name: 'ヘアピン',
  difficulty: 'easy',
  description: '幅広。大きなヘアピンが2つ',
  boardSize: { x: 33, y: 33 },
  centerline: [
    { x: 4, y: 5 },
    { x: 27, y: 5 },
    { x: 27, y: 15 },
    { x: 5, y: 15 },
    { x: 5, y: 25 },
    { x: 27, y: 25 },
  ],
  filletRadius: 4,
  halfWidth: 3,
};
