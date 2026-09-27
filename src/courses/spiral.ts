import type { CourseDefinition } from '../domain/course/types';

/**
 * うずまき(むずかしい)。細いコースが内側へ締まっていく。
 * 外側を1周してから、内側へ巻き込むように進む。輪の間隔は6、道幅は3なので、輪の間の芝は3。
 * 最も細く、角が続くので、速度の出しすぎで行き止まりになりやすい
 */
export const spiral: CourseDefinition = {
  id: 'spiral',
  name: 'うずまき',
  difficulty: 'hard',
  description: '細いコースが内側へ締まっていく',
  boardSize: { x: 33, y: 33 },
  centerline: [
    { x: 3, y: 29 },
    { x: 3, y: 3 },
    { x: 29, y: 3 },
    { x: 29, y: 29 },
    { x: 9, y: 29 },
    { x: 9, y: 9 },
    { x: 23, y: 9 },
    { x: 23, y: 23 },
    { x: 15, y: 23 },
  ],
  filletRadius: 2,
  halfWidth: 1.5,
};
