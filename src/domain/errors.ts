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
