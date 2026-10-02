import type { CourseDefinition } from '../../../src/domain/course/types';

/**
 * 直線コース: (2,5) から (20,5) まで右へ。半幅2なので、道は y が 3〜7。
 * スタートラインは x=2、ゴールラインは x=20
 */
export const straightCourse: CourseDefinition = {
  id: 'hairpin',
  name: '直線(テスト用)',
  nameEn: 'Straight (test)',
  difficulty: 'easy',
  description: 'テスト用の直線コース',
  descriptionEn: 'A straight test course',
  boardSize: { x: 33, y: 33 },
  centerline: [
    { x: 2, y: 5 },
    { x: 20, y: 5 },
  ],
  filletRadius: 2,
  halfWidth: 2,
};

/**
 * L字コース: (2,5) から (15,5) まで右へ進み、(15,20) まで下へ。
 * 角は半径3の円弧(中心 (12,8)、(12,5) から (15,8) まで)。
 * 横の道は y が 3〜7、縦の道は x が 13〜17。ゴールラインは y=20、x が 13〜17
 */
export const lCourse: CourseDefinition = {
  id: 'crank',
  name: 'L字(テスト用)',
  nameEn: 'L-shape (test)',
  difficulty: 'normal',
  description: 'テスト用のL字コース',
  descriptionEn: 'An L-shaped test course',
  boardSize: { x: 33, y: 33 },
  centerline: [
    { x: 2, y: 5 },
    { x: 15, y: 5 },
    { x: 15, y: 20 },
  ],
  filletRadius: 3,
  halfWidth: 2,
};
