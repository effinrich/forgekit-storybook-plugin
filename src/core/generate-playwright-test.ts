import type { ComponentAnalysis, PropInfo, PlaywrightTestOptions } from '../utils/types';

/**
 * Generate a co-located Playwright component test (.ct.tsx) that:
 * - Mounts the component using @playwright/experimental-ct-react
 * - Tests rendering, visual regression (screenshot), interactions, and a11y
 * - Optionally imports stories for story-driven testing
 */
export function generatePlaywrightTest(options: PlaywrightTestOptions): string {
  const { analysis, importPath, hasStories, storyImportPath } = options;
  const { name, props, exportType, hasChildren } = analysis;

  const lines: string[] = [];

  // Imports
  lines.push(`import { test, expect } from '@playwright/experimental-ct-react';`);
  lines.push(`import AxeBuilder from '@axe-core/playwright';`);

  if (exportType === 'default') {
    lines.push(`import ${name} from '${importPath}';`);
  } else {
    lines.push(`import { ${name} } from '${importPath}';`);
  }

  if (hasStories && storyImportPath) {
    lines.push(`import * as stories from '${storyImportPath}';`);
  }

  lines.push('');

  // Test suite
  lines.push(`test.describe('${name}', () => {`);

  // Mount & render test
  lines.push(`  test('mounts and renders without crashing', async ({ mount }) => {`);
  lines.push(`    const component = await mount(`);
  lines.push(`      <${name}${buildMinimalProps(props, hasChildren, name)} />`);
  lines.push(`    );`);
  lines.push(`    await expect(component).toBeVisible();`);
  lines.push(`  });`);
  lines.push('');

  // Screenshot / visual regression test
  lines.push(`  test('matches visual snapshot', async ({ mount }) => {`);
  lines.push(`    const component = await mount(`);
  lines.push(`      <${name}${buildMinimalProps(props, hasChildren, name)} />`);
  lines.push(`    );`);
  lines.push(`    await expect(component).toHaveScreenshot('${toKebab(name)}-default.png');`);
  lines.push(`  });`);
  lines.push('');

  // Interaction tests
  const clickHandler = props.find(
    (p) => p.isCallback && (p.name === 'onClick' || p.name === 'onPress')
  );
  if (clickHandler) {
    lines.push(`  test('handles click interaction', async ({ mount }) => {`);
    lines.push(`    let clicked = false;`);
    lines.push(`    const component = await mount(`);
    lines.push(`      <${name}`);
    lines.push(`        ${clickHandler.name}={() => { clicked = true; }}`);
    lines.push(...buildRequiredPropsLines(props, hasChildren, name, '        '));
    lines.push(`      />`);
    lines.push(`    );`);
    lines.push(`    await component.click();`);
    lines.push(`    expect(clicked).toBe(true);`);
    lines.push(`  });`);
    lines.push('');
  }

  const onChangeHandler = props.find(
    (p) => p.isCallback && (p.name === 'onChange' || p.name === 'onValueChange')
  );
  if (onChangeHandler) {
    lines.push(`  test('handles value change', async ({ mount }) => {`);
    lines.push(`    let changed = false;`);
    lines.push(`    const component = await mount(`);
    lines.push(`      <${name}`);
    lines.push(`        ${onChangeHandler.name}={() => { changed = true; }}`);
    lines.push(...buildRequiredPropsLines(props, hasChildren, name, '        '));
    lines.push(`      />`);
    lines.push(`    );`);
    lines.push(`    // Trigger a change event appropriate to the component type`);
    lines.push(`    await component.locator('input, select, textarea').first().fill('test');`);
    lines.push(`    expect(changed).toBe(true);`);
    lines.push(`  });`);
    lines.push('');
  }

  // Disabled state
  const disabledProp = props.find(
    (p) => p.name === 'disabled' || p.name === 'isDisabled'
  );
  if (disabledProp) {
    lines.push(`  test('renders disabled state correctly', async ({ mount }) => {`);
    lines.push(`    const component = await mount(`);
    lines.push(`      <${name}`);
    lines.push(`        ${disabledProp.name}={true}`);
    lines.push(...buildRequiredPropsLines(props, hasChildren, name, '        '));
    lines.push(`      />`);
    lines.push(`    );`);
    lines.push(`    await expect(component).toHaveScreenshot('${toKebab(name)}-disabled.png');`);
    if (clickHandler) {
      lines.push(`    // Verify click handler is not triggered when disabled`);
      lines.push(`    let clicked = false;`);
      lines.push(`    const disabledComponent = await mount(`);
      lines.push(`      <${name}`);
      lines.push(`        ${disabledProp.name}={true}`);
      lines.push(`        ${clickHandler.name}={() => { clicked = true; }}`);
      lines.push(...buildRequiredPropsLines(props, hasChildren, name, '        '));
      lines.push(`      />`);
      lines.push(`    );`);
      lines.push(`    await disabledComponent.click({ force: true });`);
      lines.push(`    expect(clicked).toBe(false);`);
    }
    lines.push(`  });`);
    lines.push('');
  }

  // Variant visual regression
  const variantProps = props.filter(
    (p) =>
      (p.name === 'size' || p.name === 'variant' || p.name === 'colorPalette') &&
      p.unionValues &&
      p.unionValues.length > 0
  );
  for (const vp of variantProps) {
    lines.push(`  test.describe('${vp.name} variants', () => {`);
    for (const val of vp.unionValues!) {
      lines.push(`    test('${vp.name}="${val}" matches snapshot', async ({ mount }) => {`);
      lines.push(`      const component = await mount(`);
      lines.push(`        <${name}`);
      lines.push(`          ${vp.name}="${val}"`);
      lines.push(...buildRequiredPropsLines(props, hasChildren, name, '          '));
      lines.push(`        />`);
      lines.push(`      );`);
      lines.push(`      await expect(component).toHaveScreenshot('${toKebab(name)}-${vp.name}-${val}.png');`);
      lines.push(`    });`);
    }
    lines.push(`  });`);
    lines.push('');
  }

  // Accessibility test
  lines.push(`  test('meets accessibility standards', async ({ mount, page }) => {`);
  lines.push(`    await mount(`);
  lines.push(`      <${name}${buildMinimalProps(props, hasChildren, name)} />`);
  lines.push(`    );`);
  lines.push(`    const a11yResults = await new AxeBuilder({ page }).analyze();`);
  lines.push(`    expect(a11yResults.violations).toEqual([]);`);
  lines.push(`  });`);

  // Story-driven tests
  if (hasStories && storyImportPath) {
    lines.push('');
    lines.push(`  test.describe('story-driven tests', () => {`);
    lines.push(`    test('renders Default story', async ({ mount }) => {`);
    lines.push(`      const args = stories.Default?.args ?? {};`);
    lines.push(`      const component = await mount(<${name} {...args} />);`);
    lines.push(`      await expect(component).toBeVisible();`);
    lines.push(`    });`);
    lines.push(`  });`);
  }

  lines.push(`});`);
  lines.push('');

  return lines.join('\n');
}

function buildMinimalProps(
  props: PropInfo[],
  hasChildren: boolean,
  componentName: string,
): string {
  const required = props.filter(
    (p) => p.required && p.name !== 'children'
  );

  if (required.length === 0 && !hasChildren) return '';

  const propStrings: string[] = [];
  for (const p of required) {
    propStrings.push(`${p.name}={${inferTestValue(p)}}`);
  }

  if (hasChildren) {
    return ` ${propStrings.join(' ')}>${componentName} content</${componentName}`;
  }

  if (propStrings.length === 0) return '';
  return ` ${propStrings.join(' ')}`;
}

function buildRequiredPropsLines(
  props: PropInfo[],
  hasChildren: boolean,
  componentName: string,
  indent: string,
): string[] {
  const lines: string[] = [];
  const required = props.filter(
    (p) => p.required && p.name !== 'children' && !p.isCallback
  );

  for (const p of required) {
    lines.push(`${indent}${p.name}={${inferTestValue(p)}}`);
  }

  if (hasChildren) {
    lines.push(`${indent}children="${componentName} content"`);
  }

  return lines;
}

function inferTestValue(prop: PropInfo): string {
  if (prop.isCallback) return '() => {}';
  if (prop.unionValues && prop.unionValues.length > 0)
    return `"${prop.unionValues[0]}"`;

  const type = prop.type.toLowerCase();
  if (type === 'string') return `"Test ${prop.name}"`;
  if (type === 'number') return '42';
  if (type === 'boolean' || type === 'bool') return 'true';

  return `undefined as any`;
}

function toKebab(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}
