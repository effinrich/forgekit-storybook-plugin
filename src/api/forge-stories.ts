import * as path from 'node:path';

import type { ForgeStoriesOptions, CoverageReport } from '../utils/types';
import { scanDirectory } from '../core/scan-directory';
import { scoreCoverage } from '../core/score-coverage';
import { forgeStory } from './forge-story';

export interface ForgeStoriesResult {
  generated: number;
  failed: number;
  alreadyCovered: number;
  notAnalyzable: number;
  total: number;
  coverage: CoverageReport;
  errors: Array<{ file: string; error: string }>;
}

/**
 * High-level: scan a directory, generate stories for all uncovered components.
 */
export async function forgeStories(options: ForgeStoriesOptions): Promise<ForgeStoriesResult> {
  const {
    dir,
    skipInteractionTests = false,
    overwrite = false,
    dryRun = false,
    includeComponentTests = false,
  } = options;

  // Import forgeTest lazily to avoid circular dependency at startup
  const { forgeTest } = includeComponentTests
    ? await import('./forge-test')
    : { forgeTest: null };

  const absoluteDir = path.resolve(dir);
  const scan = await scanDirectory(absoluteDir);

  let generated = 0;
  let failed = 0;
  const errors: Array<{ file: string; error: string }> = [];

  const filesToProcess = overwrite
    ? [...scan.withoutStories, ...scan.withStories]
    : scan.withoutStories;

  for (const filePath of filesToProcess) {
    try {
      await forgeStory({
        componentPath: filePath,
        skipInteractionTests,
        overwrite: true,
        dryRun,
        quiet: true,
      });
      generated++;

      // Generate Playwright component tests if requested
      if (forgeTest) {
        try {
          await forgeTest({
            componentPath: filePath,
            overwrite: true,
            dryRun,
            quiet: true,
          });
        } catch {
          // Non-fatal — story is the primary artifact
        }
      }
    } catch (err) {
      failed++;
      errors.push({
        file: filePath,
        error: (err as Error).message,
      });
    }
  }

  const totalAnalyzable = scan.total - scan.notAnalyzable.length;
  // When overwriting, generated count includes previously-covered files
  const totalCovered = overwrite
    ? generated
    : scan.withStories.length + generated;
  const coverage = scoreCoverage(totalCovered, totalAnalyzable);

  return {
    generated,
    failed,
    alreadyCovered: scan.withStories.length,
    notAnalyzable: scan.notAnalyzable.length,
    total: totalAnalyzable,
    coverage,
    errors,
  };
}
