import type {
  ComponentAnalysis,
  PropInfo,
  StoryContentOptions
} from '../utils/types'
import {
  STORYBOOK_META_IMPORT,
  STORYBOOK_TEST_IMPORT
} from '../utils/constants'
import { generateInteractionTests } from './generate-interaction-tests'

/**
 * Generate the full content of a .stories.tsx file from component analysis.
 */
export function generateStoryContent(options: StoryContentOptions): string {
  const { analysis, storyTitle, importPath, skipInteractionTests } = options
  const { name } = analysis

  const lines: string[] = []

  lines.push(...buildImports(analysis, importPath, skipInteractionTests))
  lines.push('')

  lines.push(...buildMeta(analysis, storyTitle))
  lines.push('')

  lines.push(`type Story = StoryObj<typeof ${name}>;`)
  lines.push('')

  lines.push(...buildDefaultStory(analysis))

  const variantStories = buildVariantStories(analysis)
  if (variantStories.length > 0) {
    lines.push('')
    lines.push(...variantStories)
  }

  const propStories = buildPropStories(analysis)
  if (propStories.length > 0) {
    lines.push('')
    lines.push(...propStories)
  }

  if (!skipInteractionTests) {
    const interactionStories = generateInteractionTests(analysis)
    if (interactionStories.length > 0) {
      lines.push('')
      lines.push(...interactionStories)
    }
  }

  lines.push('')
  return lines.join('\n')
}

function buildImports(
  analysis: ComponentAnalysis,
  importPath: string,
  skipInteractionTests: boolean
): string[] {
  const lines: string[] = []
  const metaImports = ['Meta', 'StoryObj']

  lines.push(
    `import type { ${metaImports.join(', ')} } from '${STORYBOOK_META_IMPORT}';`
  )

  // Build test imports: needed for interaction tests AND prop stories (DisabledInteractive uses fn)
  const testImports = buildTestImports(analysis, skipInteractionTests)
  if (testImports.length > 0) {
    lines.push(
      `import { ${testImports.join(', ')} } from '${STORYBOOK_TEST_IMPORT}';`
    )
  }

  if (analysis.usesRouter) {
    lines.push(`import { withRouter } from 'storybook-addon-react-router-v6';`)
  }

  lines.push(`import React from 'react';`)

  if (analysis.exportType === 'default') {
    lines.push(`import ${analysis.name} from '${importPath}';`)
  } else {
    lines.push(`import { ${analysis.name} } from '${importPath}';`)
  }

  return lines
}

function buildTestImports(
  analysis: ComponentAnalysis,
  skipInteractionTests: boolean
): string[] {
  const imports = new Set<string>()
  const { props } = analysis

  const hasCallbacks = props.some(p => p.isCallback)
  const hasClickable = props.some(
    p => p.name === 'onClick' || p.name === 'onPress'
  )
  const hasDisabledProp = props.some(
    p => p.name === 'disabled' || p.name === 'isDisabled'
  )

  if (!skipInteractionTests) {
    // RendersCorrectly and AccessibilityAudit always use expect + within
    imports.add('expect')
    imports.add('within')
    if (hasClickable) imports.add('userEvent')
  }

  // fn() is needed for callback args in meta AND DisabledInteractive story
  if (hasCallbacks) imports.add('fn')

  // DisabledInteractive uses fn() even when interaction tests are skipped
  // No additional imports needed beyond fn for that case

  return Array.from(imports)
}

function buildMeta(analysis: ComponentAnalysis, storyTitle: string): string[] {
  const lines: string[] = []
  const { name, props, usesRouter } = analysis

  lines.push(`const meta: Meta<typeof ${name}> = {`)
  lines.push(`  component: ${name},`)
  lines.push(`  title: '${storyTitle}',`)
  lines.push(`  tags: ['autodocs'],`)

  if (usesRouter) {
    lines.push(`  decorators: [withRouter],`)
  }

  const argTypes = buildArgTypes(props)
  if (argTypes.length > 0) {
    lines.push(`  argTypes: {`)
    lines.push(...argTypes)
    lines.push(`  },`)
  }

  const defaultArgs = buildDefaultArgs(props)
  if (defaultArgs.length > 0) {
    lines.push(`  args: {`)
    lines.push(...defaultArgs)
    lines.push(`  },`)
  }

  lines.push(`};`)
  lines.push('')
  lines.push(`export default meta;`)

  return lines
}

function buildArgTypes(props: PropInfo[]): string[] {
  const lines: string[] = []

  for (const prop of props) {
    if (prop.name === 'children') continue

    if (prop.isCallback) {
      lines.push(`    ${prop.name}: { action: '${prop.name}' },`)
      continue
    }

    if (prop.unionValues && prop.unionValues.length > 0) {
      const options = prop.unionValues.map(v => `'${v}'`).join(', ')
      lines.push(`    ${prop.name}: {`)
      lines.push(`      options: [${options}],`)
      lines.push(`      control: { type: 'select' },`)
      lines.push(`    },`)
      continue
    }

    const controlType = inferControlType(prop)
    if (controlType) {
      lines.push(`    ${prop.name}: { control: { type: '${controlType}' } },`)
    }
  }

  return lines
}

function buildDefaultArgs(props: PropInfo[]): string[] {
  const lines: string[] = []

  for (const prop of props) {
    if (!prop.required) continue

    if (prop.isCallback) {
      lines.push(`    ${prop.name}: fn(),`)
      continue
    }

    const defaultValue = inferDefaultValue(prop)
    if (defaultValue !== undefined) {
      lines.push(`    ${prop.name}: ${defaultValue},`)
    }
  }

  return lines
}

function buildDefaultStory(analysis: ComponentAnalysis): string[] {
  const lines: string[] = []
  const { hasChildren } = analysis

  lines.push(`export const Default: Story = {`)

  if (hasChildren) {
    lines.push(`  args: {`)
    lines.push(`    children: '${analysis.name} content',`)
    lines.push(`  },`)
  }

  lines.push(`};`)
  return lines
}

function buildVariantStories(analysis: ComponentAnalysis): string[] {
  const lines: string[] = []
  const { props, name } = analysis

  const sizeProp = props.find(p => p.name === 'size')
  if (sizeProp?.unionValues && sizeProp.unionValues.length > 0) {
    lines.push(`export const Sizes: Story = {`)
    lines.push(`  render: (args) => (`)
    lines.push(`    <>`)
    for (const size of sizeProp.unionValues) {
      lines.push(
        `      <${name} {...args} size="${size}">${analysis.hasChildren ? `Size ${size}` : ''}</${name}>`
      )
    }
    lines.push(`    </>`)
    lines.push(`  ),`)
    lines.push(`};`)
    lines.push('')
  }

  const variantProp = props.find(p => p.name === 'variant')
  if (variantProp?.unionValues && variantProp.unionValues.length > 0) {
    lines.push(`export const Variants: Story = {`)
    lines.push(`  render: (args) => (`)
    lines.push(`    <>`)
    for (const variant of variantProp.unionValues) {
      lines.push(
        `      <${name} {...args} variant="${variant}">${analysis.hasChildren ? `Variant ${variant}` : ''}</${name}>`
      )
    }
    lines.push(`    </>`)
    lines.push(`  ),`)
    lines.push(`};`)
    lines.push('')
  }

  const colorPaletteProp = props.find(p => p.name === 'colorPalette')
  if (
    colorPaletteProp?.unionValues &&
    colorPaletteProp.unionValues.length > 0
  ) {
    lines.push(`export const ColorPalettes: Story = {`)
    lines.push(`  render: (args) => (`)
    lines.push(`    <>`)
    for (const palette of colorPaletteProp.unionValues) {
      lines.push(
        `      <${name} {...args} colorPalette="${palette}">${analysis.hasChildren ? palette : ''}</${name}>`
      )
    }
    lines.push(`    </>`)
    lines.push(`  ),`)
    lines.push(`};`)
    lines.push('')
  }

  const disabledProp = props.find(
    p => p.name === 'disabled' || p.name === 'isDisabled'
  )
  if (disabledProp) {
    lines.push(`export const Disabled: Story = {`)
    lines.push(`  args: {`)
    lines.push(`    ${disabledProp.name}: true,`)
    lines.push(`  },`)
    lines.push(`};`)
  }

  return lines
}

function buildPropStories(analysis: ComponentAnalysis): string[] {
  const lines: string[] = []
  const { props, name, hasChildren } = analysis

  // Individual stories for each union value on key props (size, variant, colorPalette)
  const unionProps = props.filter(
    p =>
      p.unionValues &&
      p.unionValues.length > 0 &&
      (p.name === 'size' || p.name === 'variant' || p.name === 'colorPalette')
  )

  for (const prop of unionProps) {
    for (const value of prop.unionValues!) {
      const storyName = toPascalCase(`${prop.name}_${value}`)
      lines.push(`export const ${storyName}: Story = {`)
      lines.push(`  args: {`)
      lines.push(`    ${prop.name}: '${value}',`)
      if (hasChildren) {
        lines.push(`    children: '${name} ${value}',`)
      }
      lines.push(`  },`)
      lines.push(`};`)
      lines.push('')
    }
  }

  // Boolean prop stories (e.g. loading, fullWidth, readOnly)
  const booleanProps = props.filter(
    p =>
      !p.isCallback &&
      (p.type.toLowerCase() === 'boolean' || p.type.toLowerCase() === 'bool') &&
      p.name !== 'disabled' &&
      p.name !== 'isDisabled'
  )

  for (const boolProp of booleanProps) {
    const storyName = toPascalCase(boolProp.name)
    lines.push(`export const ${storyName}: Story = {`)
    lines.push(`  args: {`)
    lines.push(`    ${boolProp.name}: true,`)
    if (hasChildren) {
      lines.push(`    children: '${name} with ${boolProp.name}',`)
    }
    lines.push(`  },`)
    lines.push(`};`)
    lines.push('')
  }

  // WithChildren story if the component accepts children
  if (hasChildren) {
    lines.push(`export const WithChildren: Story = {`)
    lines.push(`  args: {`)
    lines.push(`    children: 'Custom child content',`)
    lines.push(`  },`)
    lines.push(`};`)
    lines.push('')
  }

  // Combined variant stories (e.g. size + variant combos) when both exist
  const sizeProp = props.find(p => p.name === 'size' && p.unionValues?.length)
  const variantProp = props.find(
    p => p.name === 'variant' && p.unionValues?.length
  )
  if (sizeProp && variantProp) {
    lines.push(`export const AllCombinations: Story = {`)
    lines.push(`  render: (args) => (`)
    lines.push(
      `    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>`
    )
    for (const variant of variantProp.unionValues!) {
      lines.push(
        `      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>`
      )
      for (const size of sizeProp.unionValues!) {
        lines.push(
          `        <${name} {...args} variant="${variant}" size="${size}">${hasChildren ? `${variant} ${size}` : ''}</${name}>`
        )
      }
      lines.push(`      </div>`)
    }
    lines.push(`    </div>`)
    lines.push(`  ),`)
    lines.push(`};`)
    lines.push('')
  }

  // DisabledInteractive: disabled + click handler to show it's inert
  const disabledProp = props.find(
    p => p.name === 'disabled' || p.name === 'isDisabled'
  )
  const clickHandler = props.find(
    p => p.isCallback && (p.name === 'onClick' || p.name === 'onPress')
  )
  if (disabledProp && clickHandler) {
    lines.push(`export const DisabledInteractive: Story = {`)
    lines.push(`  args: {`)
    lines.push(`    ${disabledProp.name}: true,`)
    lines.push(`    ${clickHandler.name}: fn(),`)
    if (hasChildren) {
      lines.push(`    children: 'Disabled ${name}',`)
    }
    lines.push(`  },`)
    lines.push(`};`)
    lines.push('')
  }

  // LongText story for components with string props or children
  const textProp = props.find(
    p =>
      !p.isCallback &&
      p.type.toLowerCase() === 'string' &&
      p.name !== 'className' &&
      p.name !== 'id'
  )
  if (textProp || hasChildren) {
    lines.push(`export const LongText: Story = {`)
    lines.push(`  args: {`)
    if (textProp) {
      lines.push(
        `    ${textProp.name}: 'This is a much longer piece of text to test how the component handles overflow and wrapping behavior',`
      )
    }
    if (hasChildren) {
      lines.push(
        `    children: 'This is a much longer piece of text to test how the component handles overflow and wrapping behavior',`
      )
    }
    lines.push(`  },`)
    lines.push(`};`)
    lines.push('')
  }

  return lines
}

function toPascalCase(str: string): string {
  return str
    .split(/[_\-\s]+/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

function inferControlType(prop: PropInfo): string | null {
  const type = prop.type.toLowerCase()

  if (type === 'boolean' || type === 'bool') return 'boolean'
  if (type === 'string') return 'text'
  if (type === 'number') return 'number'
  if (type.includes('react.reactnode') || type.includes('reactnode'))
    return null
  if (prop.isCallback) return null

  return null
}

function inferDefaultValue(prop: PropInfo): string | undefined {
  if (prop.defaultValue) return prop.defaultValue

  const type = prop.type.toLowerCase()

  if (type === 'string') return `'Example ${prop.name}'`
  if (type === 'number') return '0'
  if (type === 'boolean' || type === 'bool') return 'false'

  if (prop.unionValues && prop.unionValues.length > 0) {
    return `'${prop.unionValues[0]}'`
  }

  if (prop.isCallback) return 'fn()'

  return undefined
}
