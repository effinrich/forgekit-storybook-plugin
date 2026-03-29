import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  CHAKRA_IMPORTS,
  QUERY_IMPORTS,
  ROUTER_IMPORTS,
} from '../utils/constants';
import type {
  ComponentAnalysis,
  ImportInfo,
  PropInfo,
} from '../utils/types';

/**
 * Analyze a React component file to extract metadata for story generation.
 *
 * @param filePath - Absolute or relative path to the component file
 * @param content  - Optional file content (reads from disk if omitted)
 */
export function analyzeComponent(
  filePath: string,
  content?: string,
): ComponentAnalysis | null {
  if (!content) {
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch {
      return null;
    }
  }

  if (!content.trim()) return null;

  const name = extractComponentName(content, filePath);
  if (!name) return null;

  const imports = extractImports(content);
  const props = extractProps(content, name);

  return {
    name,
    fileName: path.basename(filePath).replace(/\.tsx?$/, ''),
    filePath,
    props,
    hasChildren: props.some((p) => p.name === 'children'),
    imports,
    usesRouter: imports.some((i) =>
      ROUTER_IMPORTS.some((r) => i.source.includes(r))
    ),
    usesReactQuery: imports.some((i) =>
      QUERY_IMPORTS.some((r) => i.source.includes(r))
    ),
    usesChakra: imports.some((i) =>
      CHAKRA_IMPORTS.some((r) => i.source.includes(r))
    ),
    exportType: detectExportType(content, name),
  };
}

function extractComponentName(
  content: string,
  filePath: string,
): string | null {
  // Match: export const ComponentName = ... or export function ComponentName(
  const namedExport = content.match(
    /export\s+(?:const|function)\s+([A-Z][A-Za-z0-9]*)/
  );
  if (namedExport) return namedExport[1];

  // Match: export default function ComponentName
  const defaultFn = content.match(
    /export\s+default\s+function\s+([A-Z][A-Za-z0-9]*)/
  );
  if (defaultFn) return defaultFn[1];

  // Match: const ComponentName = ... followed by export default ComponentName
  const constThenDefault = content.match(
    /(?:const|function)\s+([A-Z][A-Za-z0-9]*)\s*=[\s\S]*?export\s+default\s+\1/
  );
  if (constThenDefault) return constThenDefault[1];

  // Match: React.forwardRef / React.memo wrapping
  const forwardRef = content.match(
    /export\s+(?:const|default)\s+(?:const\s+)?([A-Z][A-Za-z0-9]*)\s*=\s*(?:React\.)?(?:forwardRef|memo)\s*[<(]/
  );
  if (forwardRef) return forwardRef[1];

  // Fallback: derive from file name
  const fileName = filePath.split('/').pop()?.replace(/\.tsx?$/, '');
  if (fileName && /[a-zA-Z]/.test(fileName)) {
    return fileName
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');
  }

  return null;
}

function extractImports(content: string): ImportInfo[] {
  const imports: ImportInfo[] = [];
  const importRegex =
    /import\s+(?:(?:(\{[^}]+\})|(\w+))\s+from\s+)?['"]([^'"]+)['"]/g;
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    const namedImports = match[1];
    const defaultImport = match[2];
    const source = match[3];
    const specifiers: string[] = [];

    if (namedImports) {
      const names = namedImports
        .replace(/[{}]/g, '')
        .split(',')
        .map((s) => s.trim().split(/\s+as\s+/)[0].trim())
        .filter(Boolean);
      specifiers.push(...names);
    }
    if (defaultImport) {
      specifiers.push(defaultImport);
    }

    imports.push({ source, specifiers });
  }

  return imports;
}

function extractProps(content: string, componentName: string): PropInfo[] {
  const props: PropInfo[] = [];

  const propsTypeName = findPropsTypeName(content, componentName);
  if (!propsTypeName) return props;

  // Match interface or type body — handle intersection types with &
  const interfaceMatch = content.match(
    new RegExp(
      `(?:interface|type)\\s+${propsTypeName}\\s*(?:extends\\s+[^{]+)?\\s*(?:=\\s*)?(?:[^{]*&\\s*)?\\{([^}]*)\\}`,
      's'
    )
  );
  if (!interfaceMatch) return props;

  const body = interfaceMatch[1];
  const propLines = body.split('\n').filter((line) => {
    const trimmed = line.trim();
    return trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('*');
  });

  for (const line of propLines) {
    const propMatch = line.match(
      /^\s*(\w+)(\??):\s*(.+?)(?:\s*\/\/.*)?;?\s*$/
    );
    if (!propMatch) continue;

    const [, name, optional, rawType] = propMatch;
    const type = rawType.trim().replace(/;$/, '');
    const isCallback =
      type.includes('=>') ||
      type.startsWith('(') ||
      /^on[A-Z]/.test(name);

    const unionValues = extractUnionValues(type);

    props.push({
      name,
      type,
      required: optional !== '?',
      isCallback,
      unionValues: unionValues.length > 0 ? unionValues : undefined,
    });
  }

  return props;
}

function findPropsTypeName(
  content: string,
  componentName: string,
): string | null {
  // Pattern: ComponentName = ({ ... }: PropsType)
  const destructuredProps = content.match(
    new RegExp(
      `(?:const|function)\\s+${componentName}\\s*(?:=\\s*)?\\([^)]*:\\s*([A-Z]\\w*)`
    )
  );
  if (destructuredProps) return destructuredProps[1];

  // Pattern: ComponentName(props: PropsType)
  const regularProps = content.match(
    new RegExp(
      `(?:const|function)\\s+${componentName}\\s*(?:=\\s*)?\\(\\s*(?:props|\\w+)\\s*:\\s*([A-Z]\\w*)`
    )
  );
  if (regularProps) return regularProps[1];

  // Pattern: React.FC<PropsType>
  const fcProps = content.match(
    new RegExp(`${componentName}[^=]*=\\s*(?:React\\.)?FC<([A-Z]\\w*)>`)
  );
  if (fcProps) return fcProps[1];

  // Fallback: look for interface named ComponentNameProps
  const defaultPropsName = `${componentName}Props`;
  if (content.includes(`interface ${defaultPropsName}`) || content.includes(`type ${defaultPropsName}`)) {
    return defaultPropsName;
  }

  return null;
}

function extractUnionValues(type: string): string[] {
  // Match single or double-quoted string literal unions: 'a' | 'b' or "a" | "b"
  const singleQuote = type.match(/^'[^']*'(?:\s*\|\s*'[^']*')+$/);
  if (singleQuote) {
    return type
      .split('|')
      .map((v) => v.trim().replace(/'/g, ''))
      .filter(Boolean);
  }
  const doubleQuote = type.match(/^"[^"]*"(?:\s*\|\s*"[^"]*")+$/);
  if (doubleQuote) {
    return type
      .split('|')
      .map((v) => v.trim().replace(/"/g, ''))
      .filter(Boolean);
  }
  return [];
}

function detectExportType(
  content: string,
  componentName: string,
): 'default' | 'named' | 'both' {
  const hasDefault =
    content.includes(`export default ${componentName}`) ||
    content.includes(`export default function ${componentName}`);
  const hasNamed =
    content.includes(`export const ${componentName}`) ||
    content.includes(`export function ${componentName}`);

  if (hasDefault && hasNamed) return 'both';
  if (hasDefault) return 'default';
  return 'named';
}
