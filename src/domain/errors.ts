import type { Action } from './types';

/** コース定義が、機能設計書の CourseDefinition の制約を満たさない */
export class CourseDefinitionError extends Error {
  constructor(
    public readonly courseId: string,
    reason: string
  ) {
    super(`コース定義の誤り(${courseId}): ${reason}`);
    this.name = 'CourseDefinitionError';
  }
}

/** ルールに合わない行動を適用しようとした(状態は変わらない) */
export class RuleViolationError extends Error {
  constructor(
    message: string,
    public readonly action: Action
  ) {
    super(message);
    this.name = 'RuleViolationError';
  }
}
