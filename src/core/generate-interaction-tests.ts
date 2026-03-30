import type { ComponentAnalysis, PropInfo } from '../utils/types'

/**
 * Generate interaction test stories (play functions) based on component analysis.
 * Returns an array of lines to append to the story file.
 */
export function generateInteractionTests(
  analysis: ComponentAnalysis
): string[] {
  const lines: string[] = []
  const { props, name, hasChildren } = analysis

  const clickHandlers = props.filter(
    p =>
      p.isCallback &&
      (p.name === 'onClick' ||
        p.name === 'onPress' ||
        p.name === 'onSubmit' ||
        p.name === 'onClose')
  )

  const toggleProps = props.filter(
    p =>
      !p.isCallback &&
      (p.type.toLowerCase() === 'boolean' || p.type.toLowerCase() === 'bool') &&
      (p.name === 'checked' ||
        p.name === 'isChecked' ||
        p.name === 'selected' ||
        p.name === 'open' ||
        p.name === 'isOpen')
  )

  // Click interaction test
  if (clickHandlers.length > 0) {
    lines.push(...buildClickTest(name, clickHandlers))
  }

  // Render test (always generate)
  lines.push(...buildRenderTest(name, hasChildren))

  // Keyboard navigation test
  if (clickHandlers.length > 0 || toggleProps.length > 0) {
    lines.push('')
    lines.push(...buildKeyboardTest(name, clickHandlers))
  }

  // Accessibility test (always generate)
  lines.push('')
  lines.push(...buildA11yTest(name, hasChildren))

  return lines
}

function buildClickTest(
  componentName: string,
  clickHandlers: PropInfo[]
): string[] {
  const lines: string[] = []
  const handler = clickHandlers[0]

  lines.push(`export const ClickInteraction: Story = {`)
  lines.push(`  args: {`)
  lines.push(`    ${handler.name}: fn(),`)
  lines.push(`  },`)
  lines.push(`  play: async ({ canvasElement, args }) => {`)
  lines.push(`    const canvas = within(canvasElement);`)
  lines.push('')

  if (handler.name === 'onSubmit') {
    lines.push(
      `    const submitButton = canvas.getByRole('button', { name: /submit/i });`
    )
    lines.push(`    await userEvent.click(submitButton);`)
    lines.push('')
    lines.push(
      `    await expect(args.${handler.name}).toHaveBeenCalledTimes(1);`
    )
  } else if (handler.name === 'onClose') {
    lines.push(
      `    const closeButton = canvas.getByRole('button', { name: /close/i });`
    )
    lines.push(`    await userEvent.click(closeButton);`)
    lines.push('')
    lines.push(
      `    await expect(args.${handler.name}).toHaveBeenCalledTimes(1);`
    )
  } else {
    lines.push(`    const element = canvas.getByRole('button');`)
    lines.push(`    await userEvent.click(element);`)
    lines.push('')
    lines.push(
      `    await expect(args.${handler.name}).toHaveBeenCalledTimes(1);`
    )
  }

  lines.push(`  },`)
  lines.push(`};`)

  return lines
}

function buildRenderTest(
  componentName: string,
  hasChildren: boolean
): string[] {
  const lines: string[] = []

  lines.push('')
  lines.push(`export const RendersCorrectly: Story = {`)

  if (hasChildren) {
    lines.push(`  args: {`)
    lines.push(`    children: 'Test content',`)
    lines.push(`  },`)
  }

  lines.push(`  play: async ({ canvasElement }) => {`)
  lines.push(`    const canvas = within(canvasElement);`)
  lines.push('')

  if (hasChildren) {
    lines.push(`    const element = canvas.getByText('Test content');`)
    lines.push(`    await expect(element).toBeInTheDocument();`)
  } else {
    lines.push(`    // Verify the component renders without crashing`)
    lines.push(
      `    await expect(canvas.getByRole('generic')).toBeInTheDocument();`
    )
  }

  lines.push(`  },`)
  lines.push(`};`)

  return lines
}

function buildA11yTest(componentName: string, hasChildren: boolean): string[] {
  const lines: string[] = []

  lines.push(`export const AccessibilityAudit: Story = {`)
  lines.push(`  tags: ['a11y'],`)

  if (hasChildren) {
    lines.push(`  args: {`)
    lines.push(`    children: '${componentName} content',`)
    lines.push(`  },`)
  }

  lines.push(`  play: async ({ canvasElement }) => {`)
  lines.push(`    const canvas = within(canvasElement);`)
  lines.push('')
  lines.push(`    // Verify component is rendered and visible`)

  if (hasChildren) {
    lines.push(
      `    const element = canvas.getByText('${componentName} content');`
    )
    lines.push(`    await expect(element).toBeInTheDocument();`)
  } else {
    lines.push(
      `    await expect(canvas.getByRole('generic')).toBeInTheDocument();`
    )
  }

  lines.push('')
  lines.push(`    // Verify no implicit ARIA role violations`)
  lines.push(
    `    // The @storybook/addon-a11y will run axe-core checks on this story`
  )
  lines.push(
    `    // Configure rules in .storybook/preview.tsx via the a11y addon parameter`
  )
  lines.push(`  },`)
  lines.push(`};`)

  return lines
}

function buildKeyboardTest(
  _componentName: string,
  clickHandlers: PropInfo[]
): string[] {
  const lines: string[] = []
  const handler = clickHandlers[0]

  if (!handler) return lines

  lines.push(`export const KeyboardNavigation: Story = {`)
  lines.push(`  args: {`)
  lines.push(`    ${handler.name}: fn(),`)
  lines.push(`  },`)
  lines.push(`  play: async ({ canvasElement, args }) => {`)
  lines.push(`    const canvas = within(canvasElement);`)
  lines.push('')
  lines.push(`    const element = canvas.getByRole('button');`)
  lines.push(`    await userEvent.tab();`)
  lines.push(`    await expect(element).toHaveFocus();`)
  lines.push('')
  lines.push(`    await userEvent.keyboard('{Enter}');`)
  lines.push(`    await expect(args.${handler.name}).toHaveBeenCalled();`)
  lines.push(`  },`)
  lines.push(`};`)

  return lines
}
