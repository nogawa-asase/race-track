import { createSeededRandom } from '../../../../src/domain/cpu/random';

describe('createSeededRandom', () => {
  it('同じ種からは、常に同じ列が得られる', () => {
    // Given
    const a = createSeededRandom(42);
    const b = createSeededRandom(42);

    // When / Then
    for (let i = 0; i < 20; i++) {
      expect(a.next()).toBe(b.next());
    }
  });

  it('種が違えば、違う列になる', () => {
    // Given
    const a = createSeededRandom(1);
    const b = createSeededRandom(2);

    // When
    const seqA = Array.from({ length: 5 }, () => a.next());
    const seqB = Array.from({ length: 5 }, () => b.next());

    // Then
    expect(seqA).not.toEqual(seqB);
  });

  it('値は常に0以上1未満', () => {
    // Given
    const random = createSeededRandom(7);

    // When / Then
    for (let i = 0; i < 1000; i++) {
      const value = random.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('種0でも(内部で0を避けて)正しく動く', () => {
    // Given
    const random = createSeededRandom(0);

    // When / Then
    for (let i = 0; i < 10; i++) {
      const value = random.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});
