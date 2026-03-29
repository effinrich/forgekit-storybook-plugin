import * as path from 'node:path';

/**
 * Infer a Storybook title from a component's file path.
 *
 * Strategy:
 * 1. Compute relative path from the target directory
 * 2. Strip common prefixes: src/, lib/, components/
 * 3. Convert directory segments to PascalCase
 * 4. Deduplicate consecutive identical segments
 *
 * Examples:
 *   src/components/Button/Button.tsx         → "Components / Button"
 *   src/components/forms/TextInput.tsx       → "Components / Forms / TextInput"
 *   src/lib/ui/Modal/Modal.tsx               → "UI / Modal"
 *   libs/shared/ui/src/lib/button/button.tsx → "Button"
 */
export function inferStoryTitle(filePath: string, baseDir?: string): string {
  const resolvedBase = baseDir ? path.resolve(baseDir) : path.dirname(filePath);
  const resolvedFile = path.resolve(filePath);

  let relative = path.relative(resolvedBase, resolvedFile);

  // Strip the filename — we only want directory segments
  const fileName = path.basename(relative, path.extname(relative));
  const dirPart = path.dirname(relative);

  if (dirPart === '.') {
    return `Components / ${toPascalCase(fileName)}`;
  }

  // Split into segments and clean up
  let segments = dirPart.split(path.sep);

  // Strip common prefixes
  const stripPrefixes = ['src', 'lib', 'source'];
  while (segments.length > 0 && stripPrefixes.includes(segments[0].toLowerCase())) {
    segments.shift();
  }

  // Convert to PascalCase
  const parts = segments.map((seg) => toPascalCase(seg));

  // Add the component name
  const componentName = toPascalCase(fileName);
  parts.push(componentName);

  // Deduplicate consecutive identical segments
  const deduped: string[] = [];
  for (const part of parts) {
    if (part !== deduped[deduped.length - 1]) {
      deduped.push(part);
    }
  }

  if (deduped.length === 0) {
    return `Components / ${componentName}`;
  }

  return deduped.join(' / ');
}

function toPascalCase(str: string): string {
  return str
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}
