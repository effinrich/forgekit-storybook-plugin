import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import { scanDirectory } from '../src/core/scan-directory';

const FIXTURES = path.join(__dirname, 'fixtures');

describe('scanDirectory', () => {
  it('scans a directory and finds components', async () => {
    const result = await scanDirectory(path.join(FIXTURES, 'simple'));
    expect(result.total).toBeGreaterThan(0);
    // All simple fixtures should be analyzable
    expect(result.components.length).toBeGreaterThan(0);
  });

  it('classifies components with existing stories', async () => {
    const result = await scanDirectory(path.join(FIXTURES, 'existing'));
    expect(result.withStories.length).toBe(1);
  });

  it('excludes spec/test/story files from scan', async () => {
    const result = await scanDirectory(FIXTURES);
    const filenames = result.components.map((c) => path.basename(c.filePath));
    expect(filenames).not.toContain('WithStory.stories.tsx');
  });

  it('throws for non-existent directory', async () => {
    await expect(scanDirectory('/does/not/exist')).rejects.toThrow('Directory not found');
  });
});
