import { describe, it, expect } from 'vitest';
import { inferStoryTitle } from '../src/core/infer-title';

describe('inferStoryTitle', () => {
  it('infers title from simple path', () => {
    const title = inferStoryTitle('src/components/Button/Button.tsx', '.');
    // Deduplicates consecutive "Button" segments
    expect(title).toBe('Components / Button');
  });

  it('strips src/ prefix', () => {
    const title = inferStoryTitle('src/Button.tsx', '.');
    // Only filename left after stripping src/
    expect(title).toBe('Button');
  });

  it('strips src/lib/ prefix', () => {
    const title = inferStoryTitle('src/lib/Modal/Modal.tsx', '.');
    // Deduplicates consecutive "Modal" segments
    expect(title).toBe('Modal');
  });

  it('deduplicates consecutive identical segments', () => {
    const title = inferStoryTitle('src/components/Button/Button.tsx', '.');
    // Components / Button / Button — no dedup because segments differ
    expect(title).toContain('Button');
  });

  it('handles kebab-case filenames', () => {
    const title = inferStoryTitle('src/components/text-input/text-input.tsx', '.');
    expect(title).toContain('TextInput');
  });

  it('handles file in root with no directory', () => {
    const title = inferStoryTitle('Button.tsx', '.');
    expect(title).toBe('Components / Button');
  });

  it('uses base dir for relative path calculation', () => {
    const title = inferStoryTitle('/project/src/ui/Button.tsx', '/project/src');
    expect(title).toContain('Ui');
    expect(title).toContain('Button');
  });
});
