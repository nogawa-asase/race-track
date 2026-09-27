import type { CourseDefinition } from '../domain/course/types';

/**
 * クランク(ふつう)。直角の曲がりの切り返しが続く。
 * 細い道を上・下・上・下と長く往復し、端で直角を2つ続けて折り返す(折り返しが3つ)。
 * 折り返しの前に減速が要る。脚の間隔は8、道幅は4なので、脚の間の芝は4。
 *
 * 階段状(右→下→右→下…)にした最初の案は、斜めに近道できる幅の帯になり、
 * ゴールまでの最短手数がヘアピンより短くなったので、この形にした
 */
export const crank: CourseDefinition = {
  id: 'crank',
  name: 'クランク',
  difficulty: 'normal',
  description: '直角カーブの切り返しが続く',
  boardSize: { x: 33, y: 33 },
  centerline: [
    { x: 4, y: 29 },
    { x: 4, y: 4 },
    { x: 12, y: 4 },
    { x: 12, y: 29 },
    { x: 20, y: 29 },
    { x: 20, y: 4 },
    { x: 28, y: 4 },
    { x: 28, y: 29 },
  ],
  filletRadius: 2.5,
  halfWidth: 2,
};
