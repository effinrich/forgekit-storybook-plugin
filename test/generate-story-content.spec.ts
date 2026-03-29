import { describe, it, expect } from 'vitest';
import { generateStoryContent } from '../src/core/generate-story-content';
import type { ComponentAnalysis } from '../src/utils/types';

function makeAnalysis(overrides: Partial<ComponentAnalysis> = {}): ComponentAnalysis {
  return {
    name: 'Button',
    fileName: 'Button',
    filePath: 'src/Button.tsx',
    props: [
      { name: 'label', type: 'string', required: true, isCallback: false },
      { name: 'onClick', type: '() => void', required: false, isCallback: true },
    ],
    hasChildren: false,
    imports: [],
    usesRouter: false,
    usesReactQuery: false,
    usesChakra: false,
    exportType: 'named',
    ...overrides,
  };
}

describe('generateStoryContent', () => {
  it('generates a basic story file', () => {
    const content = generateStoryContent({
      analysis: makeAnalysis(),
      storyTitle: 'Components / Button',
      importPath: './Button',
      skipInteractionTests: false,
    });

    expect(content).toContain("import type { Meta, StoryObj } from '@storybook/react-vite'");
    expect(content).toContain("import { Button } from './Button'");
    expect(content).toContain("title: 'Components / Button'");
    expect(content).toContain("tags: ['autodocs']");
    expect(content).toContain('export const Default: Story');
    expect(content).toContain("label: 'Example label'");
  });

  it('generates variant stories for size/variant props', () => {
    const analysis = makeAnalysis({
      props: [
        { name: 'label', type: 'string', required: true, isCallback: false },
        { name: 'size', type: "'sm' | 'md' | 'lg'", required: false, isCallback: false, unionValues: ['sm', 'md', 'lg'] },
        { name: 'variant', type: "'primary' | 'secondary'", required: false, isCallback: false, unionValues: ['primary', 'secondary'] },
      ],
    });

    const content = generateStoryContent({
      analysis,
      storyTitle: 'Components / Button',
      importPath: './Button',
      skipInteractionTests: true,
    });

    expect(content).toContain('export const Sizes: Story');
    expect(content).toContain('size="sm"');
    expect(content).toContain('size="lg"');
    expect(content).toContain('export const Variants: Story');
    expect(content).toContain('variant="primary"');
  });

  it('generates disabled story', () => {
    const analysis = makeAnalysis({
      props: [
        { name: 'label', type: 'string', required: true, isCallback: false },
        { name: 'disabled', type: 'boolean', required: false, isCallback: false },
      ],
    });

    const content = generateStoryContent({
      analysis,
      storyTitle: 'Button',
      importPath: './Button',
      skipInteractionTests: true,
    });

    expect(content).toContain('export const Disabled: Story');
    expect(content).toContain('disabled: true');
  });

  it('uses default import for default-exported components', () => {
    const analysis = makeAnalysis({ exportType: 'default' });
    const content = generateStoryContent({
      analysis,
      storyTitle: 'Button',
      importPath: './Button',
      skipInteractionTests: true,
    });

    expect(content).toContain("import Button from './Button'");
  });

  it('adds router decorator when component uses router', () => {
    const analysis = makeAnalysis({ usesRouter: true });
    const content = generateStoryContent({
      analysis,
      storyTitle: 'Button',
      importPath: './Button',
      skipInteractionTests: true,
    });

    expect(content).toContain("import { withRouter }");
    expect(content).toContain('decorators: [withRouter]');
  });

  it('skips interaction tests when requested', () => {
    const content = generateStoryContent({
      analysis: makeAnalysis(),
      storyTitle: 'Button',
      importPath: './Button',
      skipInteractionTests: true,
    });

    expect(content).not.toContain('RendersCorrectly');
    expect(content).not.toContain('AccessibilityAudit');
    expect(content).not.toContain("from '@storybook/test'");
  });

  it('generates children content in Default story', () => {
    const analysis = makeAnalysis({
      hasChildren: true,
      props: [
        { name: 'children', type: 'React.ReactNode', required: false, isCallback: false },
      ],
    });

    const content = generateStoryContent({
      analysis,
      storyTitle: 'Button',
      importPath: './Button',
      skipInteractionTests: true,
    });

    expect(content).toContain("children: 'Button content'");
  });
});
