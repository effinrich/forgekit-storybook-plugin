export interface PropInfo {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: string;
  description?: string;
  isCallback: boolean;
  unionValues?: string[];
}

export interface ComponentAnalysis {
  name: string;
  fileName: string;
  filePath: string;
  props: PropInfo[];
  hasChildren: boolean;
  imports: ImportInfo[];
  usesRouter: boolean;
  usesReactQuery: boolean;
  usesChakra: boolean;
  exportType: 'default' | 'named' | 'both';
}

export interface ImportInfo {
  source: string;
  specifiers: string[];
}

export interface ForgeStoryOptions {
  componentPath: string;
  storyTitle?: string;
  skipInteractionTests?: boolean;
  overwrite?: boolean;
  dryRun?: boolean;
  quiet?: boolean;
}

export interface ForgeStoriesOptions {
  dir: string;
  skipInteractionTests?: boolean;
  overwrite?: boolean;
  dryRun?: boolean;
  includeA11y?: boolean;
  includeComponentTests?: boolean;
  quiet?: boolean;
}

export interface ForgeTestOptions {
  componentPath: string;
  overwrite?: boolean;
  dryRun?: boolean;
  quiet?: boolean;
}

export interface WatchOptions {
  dir: string;
  ignore?: string[];
  debounceMs?: number;
  skipInteractionTests?: boolean;
  quiet?: boolean;
}

export interface ScanResult {
  components: ScannedComponent[];
  withStories: string[];
  withoutStories: string[];
  notAnalyzable: string[];
  total: number;
}

export interface ScannedComponent {
  filePath: string;
  analysis: ComponentAnalysis | null;
  hasStory: boolean;
}

export interface CoverageReport {
  covered: number;
  total: number;
  percentage: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

export interface StoryContentOptions {
  analysis: ComponentAnalysis;
  storyTitle: string;
  importPath: string;
  skipInteractionTests: boolean;
}

export interface PlaywrightTestOptions {
  analysis: ComponentAnalysis;
  importPath: string;
  hasStories: boolean;
  storyImportPath?: string;
}
