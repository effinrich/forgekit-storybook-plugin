import * as fs from 'node:fs';
import * as path from 'node:path';

import { COMPONENT_EXTENSIONS, CT_FILE_SUFFIX, STORY_FILE_SUFFIX } from '../utils/constants';
import type { ForgeTestOptions, ComponentAnalysis } from '../utils/types';
import { analyzeComponent } from '../core/analyze-component';
import { generatePlaywrightTest } from '../core/generate-playwright-test';

export interface ForgeTestResult {
  testPath: string;
  content: string;
  analysis: ComponentAnalysis;
  written: boolean;
}

/**
 * High-level: analyze a component, generate a Playwright component test, and write it.
 */
export async function forgeTest(options: ForgeTestOptions): Promise<ForgeTestResult> {
  const { componentPath, overwrite = false, dryRun = false } = options;

  const resolvedPath = resolveComponentPath(componentPath);
  if (!resolvedPath) {
    throw new Error(`Component file not found: ${componentPath}`);
  }

  const testPath = resolvedPath.replace(/\.tsx?$/, CT_FILE_SUFFIX);
  if (fs.existsSync(testPath) && !overwrite) {
    throw new Error(`Test already exists: ${testPath}. Use --overwrite to replace.`);
  }

  const analysis = analyzeComponent(resolvedPath);
  if (!analysis) {
    throw new Error(`Could not analyze component at ${resolvedPath}. Ensure it exports a React component.`);
  }

  const storyPath = resolvedPath.replace(/\.tsx?$/, STORY_FILE_SUFFIX);
  const hasStories = fs.existsSync(storyPath);
  const importPath = `./${analysis.fileName}`;
  const storyImportPath = hasStories
    ? `./${path.basename(storyPath, '.tsx')}`
    : undefined;

  const content = generatePlaywrightTest({
    analysis,
    importPath,
    hasStories,
    storyImportPath,
  });

  let written = false;
  if (!dryRun) {
    const dir = path.dirname(testPath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(testPath, content, 'utf-8');
    written = true;
  }

  return { testPath, content, analysis, written };
}

function resolveComponentPath(componentPath: string): string | null {
  const resolved = path.resolve(componentPath);

  if (fs.existsSync(resolved)) return resolved;

  for (const ext of COMPONENT_EXTENSIONS) {
    const withExt = resolved + ext;
    if (fs.existsSync(withExt)) return withExt;
  }

  return null;
}
