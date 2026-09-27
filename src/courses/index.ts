import type { CourseDefinition, CourseId } from '../domain/course/types';
import { crank } from './crank';
import { hairpin } from './hairpin';
import { spiral } from './spiral';

/** 全コース。設定画面の並び(やさしい → ふつう → むずかしい)と同じ */
export const COURSES: readonly CourseDefinition[] = [hairpin, crank, spiral];

/** ID からコース定義を引く */
export function getCourseDefinition(id: CourseId): CourseDefinition {
  const course = COURSES.find((c) => c.id === id);
  if (!course) {
    throw new Error(`未知のコースID: ${id}`);
  }
  return course;
}
