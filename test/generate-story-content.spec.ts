import { describe, it, expect } from 'vitest'
import { generateStoryContent } from '../src/core/generate-story-content'
import type { ComponentAnalysis } from '../src/utils/types'

function makeAnalysis(
  overrides: Partial<ComponentAnalysis> = {}
): ComponentAnalysis {
  return {
    name: 'Button',
    fileName: 'Button',
    filePath: 'src/Button.tsx',
    props: [
      { name: 'label', type: 'string', required: true, isCallback: false },
      { name: 'onClick', type: '() => void', required: false, isCallback: true }
    ],
    hasChildren: false,
    imports: [],
    usesRouter: false,
    usesReactQuery: false,
    usesChakra: false,
    exportType: 'named',
    ...overrides
  }
}

describe('generateStoryContent', () => {
  it('generates a basic story file', () => {
    const content = generateStoryContent({
      analysis: makeAnalysis(),
      storyTitle: 'Components / Button',
      importPath: './Button',
      skipInteractionTests: false
    })

    expect(content).toContain(
      "import type { Meta, StoryObj } from '@storybook/react-vite'"
    )
    expect(content).toContain("from 'storybook/test'")
    expect(content).toContain("import { Button } from './Button'")
    expect(content).toContain("title: 'Components / Button'")
    expect(content).toContain("tags: ['autodocs']")
    expect(content).toContain('export const Default: Story')
    expect(content).toContain("label: 'Example label'")
  })

  it('generates variant stories for size/variant props', () => {
    const analysis = makeAnalysis({
      props: [
        { name: 'label', type: 'string', required: true, isCallback: false },
        {
          name: 'size',
          type: "'sm' | 'md' | 'lg'",
          required: false,
          isCallback: false,
          unionValues: ['sm', 'md', 'lg']
        },
        {
          name: 'variant',
          type: "'primary' | 'secondary'",
          required: false,
          isCallback: false,
          unionValues: ['primary', 'secondary']
        }
      ]
    })

    const content = generateStoryContent({
      analysis,
      storyTitle: 'Components / Button',
      importPath: './Button',
      skipInteractionTests: true
    })

    expect(content).toContain('export const Sizes: Story')
    expect(content).toContain('size="sm"')
    expect(content).toContain('size="lg"')
    expect(content).toContain('export const Variants: Story')
    expect(content).toContain('variant="primary"')
  })

  it('generates disabled story', () => {
    const analysis = makeAnalysis({
      props: [
        { name: 'label', type: 'string', required: true, isCallback: false },
        {
          name: 'disabled',
          type: 'boolean',
          required: false,
          isCallback: false
        }
      ]
    })

    const content = generateStoryContent({
      analysis,
      storyTitle: 'Button',
      importPath: './Button',
      skipInteractionTests: true
    })

    expect(content).toContain('export const Disabled: Story')
    expect(content).toContain('disabled: true')
  })

  it('uses default import for default-exported components', () => {
    const analysis = makeAnalysis({ exportType: 'default' })
    const content = generateStoryContent({
      analysis,
      storyTitle: 'Button',
      importPath: './Button',
      skipInteractionTests: true
    })

    expect(content).toContain("import Button from './Button'")
  })

  it('adds router decorator when component uses router', () => {
    const analysis = makeAnalysis({ usesRouter: true })
    const content = generateStoryContent({
      analysis,
      storyTitle: 'Button',
      importPath: './Button',
      skipInteractionTests: true
    })

    expect(content).toContain('import { withRouter }')
    expect(content).toContain('decorators: [withRouter]')
  })

  it('skips interaction tests when requested', () => {
    const content = generateStoryContent({
      analysis: makeAnalysis(),
      storyTitle: 'Button',
      importPath: './Button',
      skipInteractionTests: true
    })

    expect(content).not.toContain('RendersCorrectly')
    expect(content).not.toContain('AccessibilityAudit')
    // fn is still imported for callback args, but expect/within/userEvent are not
    expect(content).not.toContain('expect')
    expect(content).not.toContain('within')
    expect(content).not.toContain('userEvent')
  })

  it('generates children content in Default story', () => {
    const analysis = makeAnalysis({
      hasChildren: true,
      props: [
        {
          name: 'children',
          type: 'React.ReactNode',
          required: false,
          isCallback: false
        }
      ]
    })

    const content = generateStoryContent({
      analysis,
      storyTitle: 'Button',
      importPath: './Button',
      skipInteractionTests: true
    })

    expect(content).toContain("children: 'Button content'")
  })

  it('generates individual stories for each union value', () => {
    const analysis = makeAnalysis({
      props: [
        { name: 'label', type: 'string', required: true, isCallback: false },
        {
          name: 'size',
          type: "'sm' | 'md' | 'lg'",
          required: false,
          isCallback: false,
          unionValues: ['sm', 'md', 'lg']
        },
        {
          name: 'variant',
          type: "'primary' | 'secondary'",
          required: false,
          isCallback: false,
          unionValues: ['primary', 'secondary']
        }
      ]
    })

    const content = generateStoryContent({
      analysis,
      storyTitle: 'Button',
      importPath: './Button',
      skipInteractionTests: true
    })

    expect(content).toContain('export const SizeSm: Story')
    expect(content).toContain('export const SizeMd: Story')
    expect(content).toContain('export const SizeLg: Story')
    expect(content).toContain('export const VariantPrimary: Story')
    expect(content).toContain('export const VariantSecondary: Story')
  })

  it('generates AllCombinations story when size + variant both exist', () => {
    const analysis = makeAnalysis({
      props: [
        { name: 'label', type: 'string', required: true, isCallback: false },
        {
          name: 'size',
          type: "'sm' | 'md'",
          required: false,
          isCallback: false,
          unionValues: ['sm', 'md']
        },
        {
          name: 'variant',
          type: "'primary' | 'ghost'",
          required: false,
          isCallback: false,
          unionValues: ['primary', 'ghost']
        }
      ]
    })

    const content = generateStoryContent({
      analysis,
      storyTitle: 'Button',
      importPath: './Button',
      skipInteractionTests: true
    })

    expect(content).toContain('export const AllCombinations: Story')
    expect(content).toContain('variant="primary" size="sm"')
    expect(content).toContain('variant="ghost" size="md"')
  })

  it('generates boolean prop stories', () => {
    const analysis = makeAnalysis({
      props: [
        { name: 'label', type: 'string', required: true, isCallback: false },
        {
          name: 'loading',
          type: 'boolean',
          required: false,
          isCallback: false
        },
        {
          name: 'fullWidth',
          type: 'boolean',
          required: false,
          isCallback: false
        },
        {
          name: 'disabled',
          type: 'boolean',
          required: false,
          isCallback: false
        }
      ]
    })

    const content = generateStoryContent({
      analysis,
      storyTitle: 'Button',
      importPath: './Button',
      skipInteractionTests: true
    })

    expect(content).toContain('export const Loading: Story')
    expect(content).toContain('export const FullWidth: Story')
    // disabled is handled by Disabled story from variant stories, not duplicated
    expect(content).toContain('export const Disabled: Story')
  })

  it('generates LongText story for string prop components', () => {
    const analysis = makeAnalysis({
      props: [
        { name: 'label', type: 'string', required: true, isCallback: false }
      ]
    })

    const content = generateStoryContent({
      analysis,
      storyTitle: 'Button',
      importPath: './Button',
      skipInteractionTests: true
    })

    expect(content).toContain('export const LongText: Story')
    expect(content).toContain('overflow and wrapping behavior')
  })

  it('generates DisabledInteractive story when disabled + click handler', () => {
    const analysis = makeAnalysis({
      props: [
        { name: 'label', type: 'string', required: true, isCallback: false },
        {
          name: 'disabled',
          type: 'boolean',
          required: false,
          isCallback: false
        },
        {
          name: 'onClick',
          type: '() => void',
          required: false,
          isCallback: true
        }
      ]
    })

    const content = generateStoryContent({
      analysis,
      storyTitle: 'Button',
      importPath: './Button',
      skipInteractionTests: true
    })

    expect(content).toContain('export const DisabledInteractive: Story')
    expect(content).toContain('disabled: true')
    expect(content).toContain('onClick: fn()')
  })

  it('generates WithChildren story for components accepting children', () => {
    const analysis = makeAnalysis({
      hasChildren: true,
      props: [
        {
          name: 'children',
          type: 'React.ReactNode',
          required: false,
          isCallback: false
        },
        {
          name: 'variant',
          type: "'solid' | 'outline'",
          required: false,
          isCallback: false,
          unionValues: ['solid', 'outline']
        }
      ]
    })

    const content = generateStoryContent({
      analysis,
      storyTitle: 'Button',
      importPath: './Button',
      skipInteractionTests: true
    })

    expect(content).toContain('export const WithChildren: Story')
    expect(content).toContain("children: 'Custom child content'")
  })
})
