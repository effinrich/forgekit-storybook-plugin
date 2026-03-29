import { describe, it, expect } from 'vitest';
import { scoreCoverage } from '../src/core/score-coverage';

describe('scoreCoverage', () => {
  it('returns grade A for 90%+', () => {
    expect(scoreCoverage(90, 100).grade).toBe('A');
    expect(scoreCoverage(100, 100).grade).toBe('A');
  });

  it('returns grade B for 75-89%', () => {
    expect(scoreCoverage(75, 100).grade).toBe('B');
    expect(scoreCoverage(89, 100).grade).toBe('B');
  });

  it('returns grade C for 50-74%', () => {
    expect(scoreCoverage(50, 100).grade).toBe('C');
    expect(scoreCoverage(74, 100).grade).toBe('C');
  });

  it('returns grade D for 25-49%', () => {
    expect(scoreCoverage(25, 100).grade).toBe('D');
    expect(scoreCoverage(49, 100).grade).toBe('D');
  });

  it('returns grade F for 0-24%', () => {
    expect(scoreCoverage(0, 100).grade).toBe('F');
    expect(scoreCoverage(24, 100).grade).toBe('F');
  });

  it('returns grade F for zero total', () => {
    const result = scoreCoverage(0, 0);
    expect(result.grade).toBe('F');
    expect(result.percentage).toBe(0);
  });

  it('calculates correct percentage', () => {
    expect(scoreCoverage(7, 10).percentage).toBe(70);
    expect(scoreCoverage(3, 4).percentage).toBe(75);
  });
});
