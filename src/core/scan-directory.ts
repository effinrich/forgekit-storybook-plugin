import fg from 'fast-glob';
import * as path from 'node:path';
import * as fs from 'node:fs';

import {
  COMPONENT_EXTENSIONS,
  IGNORED_DIRS,
  STORY_FILE_SUFFIX,
} from '../utils/constants';
import type { ScanResult, ScannedComponent } from '../utils/types';
import { analyzeComponent } from './analyze-component';

/**
 * Scan a directory for React components and classify them by story coverage.
 */
export async function scanDirectory(dir: string): Promise<ScanResult> {
  const absoluteDir = path.resolve(dir);

  if (!fs.existsSync(absoluteDir)) {
    throw new Error(`Directory not found: ${absoluteDir}`);
  }

  const extensions = COMPONENT_EXTENSIONS.map((e) => e.replace('.', '')).join(',');
  const ignorePatterns = [
    ...IGNORED_DIRS.map((d) => `**/${d}/**`),
    '**/*.spec.*',
    '**/*.test.*',
    '**/*.stories.*',
    '**/*.styles.*',
    '**/*.style.*',
    '**/index.ts',
    '**/index.tsx',
  ];

  const files = await fg(`**/*.{${extensions}}`, {
    cwd: absoluteDir,
    ignore: ignorePatterns,
    absolute: true,
  });

  const components: ScannedComponent[] = [];
  const withStories: string[] = [];
  const withoutStories: string[] = [];
  const notAnalyzable: string[] = [];

  for (const filePath of files) {
    const analysis = analyzeComponent(filePath);
    const storyPath = filePath.replace(/\.tsx?$/, STORY_FILE_SUFFIX);
    const hasStory = fs.existsSync(storyPath);

    components.push({ filePath, analysis, hasStory });

    if (!analysis) {
      notAnalyzable.push(filePath);
    } else if (hasStory) {
      withStories.push(filePath);
    } else {
      withoutStories.push(filePath);
    }
  }

  return {
    components,
    withStories,
    withoutStories,
    notAnalyzable,
    total: files.length,
  };
}
