export const STORY_FILE_SUFFIX = '.stories.tsx';
export const CT_FILE_SUFFIX = '.ct.tsx';
export const COMPONENT_EXTENSIONS = ['.tsx', '.ts'];

export const IGNORED_FILES = [
  '*.spec.*',
  '*.test.*',
  '*.stories.*',
  '*.styles.*',
  '*.style.*',
  'index.ts',
  'index.tsx',
];

export const IGNORED_DIRS = [
  'node_modules',
  'dist',
  'build',
  '.storybook',
  '.next',
  '.vite',
  'coverage',
  '__tests__',
  '__mocks__',
];

export const CHAKRA_IMPORTS = ['@chakra-ui/react', '@redesignhealth/ui'];
export const ROUTER_IMPORTS = ['react-router-dom', 'react-router'];
export const QUERY_IMPORTS = ['@tanstack/react-query', 'react-query'];
export const ZUSTAND_IMPORTS = ['zustand'];
export const FORMIK_IMPORTS = ['formik'];
export const RHF_IMPORTS = ['react-hook-form'];

export const DEFAULT_DEBOUNCE_MS = 300;

export const STORYBOOK_TEST_IMPORT = '@storybook/test';
export const STORYBOOK_META_IMPORT = '@storybook/react-vite';
