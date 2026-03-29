import { watch as chokidarWatch } from 'chokidar';
import * as path from 'node:path';
import * as fs from 'node:fs';

import {
  COMPONENT_EXTENSIONS,
  IGNORED_DIRS,
  STORY_FILE_SUFFIX,
  DEFAULT_DEBOUNCE_MS,
} from '../utils/constants';
import type { WatchOptions } from '../utils/types';
import { forgeStory } from '../api/forge-story';

export interface WatchHandle {
  close(): Promise<void>;
}

export type WatchEvent =
  | { type: 'ready' }
  | { type: 'generate'; file: string; storyPath: string }
  | { type: 'update'; file: string; storyPath: string }
  | { type: 'error'; file: string; error: Error };

export type WatchCallback = (event: WatchEvent) => void;

/**
 * Watch a directory for component changes and auto-generate stories.
 * Returns a handle with .close() for cleanup.
 */
export function watchDirectory(
  options: WatchOptions,
  callback?: WatchCallback,
): WatchHandle {
  const {
    dir,
    ignore = [],
    debounceMs = DEFAULT_DEBOUNCE_MS,
    skipInteractionTests = false,
  } = options;

  const absoluteDir = path.resolve(dir);

  if (!fs.existsSync(absoluteDir)) {
    throw new Error(`Watch directory not found: ${absoluteDir}`);
  }

  const extensions = COMPONENT_EXTENSIONS.map((e) => e.replace('.', ''));
  const globPattern = `**/*.{${extensions.join(',')}}`;

  const ignored = [
    ...IGNORED_DIRS.map((d) => `**/${d}/**`),
    '**/*.spec.*',
    '**/*.test.*',
    '**/*.stories.*',
    '**/*.styles.*',
    '**/*.style.*',
    '**/index.{ts,tsx}',
    ...ignore,
  ];

  const pending = new Map<string, ReturnType<typeof setTimeout>>();

  const watcher = chokidarWatch(globPattern, {
    cwd: absoluteDir,
    ignored,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 50,
    },
  });

  const processChange = async (relativePath: string) => {
    const filePath = path.join(absoluteDir, relativePath);
    const storyPath = filePath.replace(/\.tsx?$/, STORY_FILE_SUFFIX);
    const isUpdate = fs.existsSync(storyPath);

    try {
      await forgeStory({
        componentPath: filePath,
        skipInteractionTests,
        overwrite: true,
        quiet: true,
      });

      callback?.({
        type: isUpdate ? 'update' : 'generate',
        file: filePath,
        storyPath,
      });
    } catch (err) {
      callback?.({
        type: 'error',
        file: filePath,
        error: err as Error,
      });
    }
  };

  const debouncedProcess = (relativePath: string) => {
    if (pending.has(relativePath)) {
      clearTimeout(pending.get(relativePath)!);
    }

    pending.set(
      relativePath,
      setTimeout(() => {
        pending.delete(relativePath);
        processChange(relativePath);
      }, debounceMs),
    );
  };

  watcher.on('change', debouncedProcess);
  watcher.on('add', debouncedProcess);
  watcher.on('ready', () => callback?.({ type: 'ready' }));

  return {
    async close() {
      for (const timeout of pending.values()) {
        clearTimeout(timeout);
      }
      pending.clear();
      await watcher.close();
    },
  };
}
