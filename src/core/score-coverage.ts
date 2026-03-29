import type { CoverageReport } from '../utils/types';

/**
 * Calculate a coverage score and letter grade from covered/total counts.
 */
export function scoreCoverage(covered: number, total: number): CoverageReport {
  if (total === 0) {
    return { covered: 0, total: 0, percentage: 0, grade: 'F' };
  }

  const percentage = Math.round((covered / total) * 100);

  let grade: CoverageReport['grade'];
  if (percentage >= 90) grade = 'A';
  else if (percentage >= 75) grade = 'B';
  else if (percentage >= 50) grade = 'C';
  else if (percentage >= 25) grade = 'D';
  else grade = 'F';

  return { covered, total, percentage, grade };
}
