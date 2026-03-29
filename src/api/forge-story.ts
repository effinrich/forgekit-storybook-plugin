import * as fs from 'node:fs';
import * as path from 'node:path';

import { COMPONENT_EXTENSIONS, STORY_FILE_SUFFIX } from '../utils/constants';
import type { ForgeStoryOptions, ComponentAnalysis } from '../utils/types';
import { analyzeComponent } from '../core/analyze-component';
import { generateStoryContent } from '../core/generate-story-content';
import { inferStoryTitle } from '../core/infer-title';

export interface ForgeStoryResult {
  storyPath: string;
  content: string;
  analysis: ComponentAnalysis;
  storiesGenerated: string[];
  written: boolean;
}

/**
 * High-level: analyze a component, generate a story, and write it to disk.
 */
export async function forgeStory(options: ForgeStoryOptions): Promise<ForgeStoryResult> {
  const { componentPath, storyTitle, skipInteractionTests = false, overwrite = false, dryRun = false } = options;

  // Resolve component file
  const resolvedPath = resolveComponentPath(componentPath);
  if (!resolvedPath) {
    throw new Error(`Component file not found: ${componentPath}`);
  }

  // Check for existing story
  const storyPath = resolvedPath.replace(/\.tsx?$/, STORY_FILE_SUFFIX);
  if (fs.existsSync(storyPath) && !overwrite) {
    throw new Error(`Story already exists: ${storyPath}. Use --overwrite to replace.`);
  }

  // Analyze
  const analysis = analyzeComponent(resolvedPath);
  if (!analysis) {
    throw new Error(`Could not analyze component at ${resolvedPath}. Ensure it exports a React component.`);
  }

  // Infer title
  const title = storyTitle ?? inferStoryTitle(resolvedPath);
  const importPath = `./${analysis.fileName}`;

  // Generate
  const content = generateStoryContent({
    analysis,
    storyTitle: title,
    importPath,
    skipInteractionTests,
  });

  // Determine which stories were generated
  const storiesGenerated = collectStoriesGenerated(analysis, skipInteractionTests);

  // Write
  let written = false;
  if (!dryRun) {
    const dir = path.dirname(storyPath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(storyPath, content, 'utf-8');
    written = true;
  }

  return { storyPath, content, analysis, storiesGenerated, written };
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

function collectStoriesGenerated(analysis: ComponentAnalysis, skipInteractionTests: boolean): string[] {
  const stories = ['Default'];

  if (analysis.props.some((p) => p.name === 'size' && p.unionValues?.length)) {
    stories.push('Sizes');
  }
  if (analysis.props.some((p) => p.name === 'variant' && p.unionValues?.length)) {
    stories.push('Variants');
  }
  if (analysis.props.some((p) => p.name === 'colorPalette' && p.unionValues?.length)) {
    stories.push('ColorPalettes');
  }
  if (analysis.props.some((p) => p.name === 'disabled' || p.name === 'isDisabled')) {
    stories.push('Disabled');
  }

  if (!skipInteractionTests) {
    stories.push('RendersCorrectly', 'AccessibilityAudit');
    if (analysis.props.some(
      (p) => p.isCallback && ['onClick', 'onPress', 'onSubmit', 'onClose'].includes(p.name)
    )) {
      stories.push('ClickInteraction', 'KeyboardNavigation');
    }
  }

  return stories;
}
