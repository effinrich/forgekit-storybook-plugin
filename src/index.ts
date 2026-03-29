// Core analysis
export { analyzeComponent } from './core/analyze-component';
export { scanDirectory } from './core/scan-directory';

// Generation
export { generateStoryContent } from './core/generate-story-content';
export { generateInteractionTests } from './core/generate-interaction-tests';
export { generatePlaywrightTest } from './core/generate-playwright-test';

// Coverage
export { scoreCoverage } from './core/score-coverage';

// Title inference
export { inferStoryTitle } from './core/infer-title';

// Watch
export { watchDirectory } from './core/watch';
export type { WatchHandle, WatchEvent, WatchCallback } from './core/watch';

// High-level orchestration
export { forgeStory } from './api/forge-story';
export type { ForgeStoryResult } from './api/forge-story';
export { forgeStories } from './api/forge-stories';
export type { ForgeStoriesResult } from './api/forge-stories';
export { forgeTest } from './api/forge-test';
export type { ForgeTestResult } from './api/forge-test';

// Types
export type {
  ComponentAnalysis,
  PropInfo,
  ImportInfo,
  ScanResult,
  ScannedComponent,
  CoverageReport,
  ForgeStoryOptions,
  ForgeStoriesOptions,
  ForgeTestOptions,
  WatchOptions,
  StoryContentOptions,
  PlaywrightTestOptions,
} from './utils/types';
