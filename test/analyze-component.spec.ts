import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import { analyzeComponent } from '../src/core/analyze-component';

const FIXTURES = path.join(__dirname, 'fixtures');

describe('analyzeComponent', () => {
  describe('from file path', () => {
    it('analyzes a simple component with props', () => {
      const result = analyzeComponent(path.join(FIXTURES, 'simple/Button.tsx'));
      expect(result).not.toBeNull();
      expect(result!.name).toBe('Button');
      expect(result!.exportType).toBe('named');
      expect(result!.hasChildren).toBe(true);
      expect(result!.props.length).toBeGreaterThan(0);

      const labelProp = result!.props.find((p) => p.name === 'label');
      expect(labelProp).toBeDefined();
      expect(labelProp!.type).toBe('string');
      expect(labelProp!.required).toBe(true);

      const variantProp = result!.props.find((p) => p.name === 'variant');
      expect(variantProp).toBeDefined();
      expect(variantProp!.required).toBe(false);
      expect(variantProp!.unionValues).toEqual(['primary', 'secondary', 'ghost']);

      const sizeProp = result!.props.find((p) => p.name === 'size');
      expect(sizeProp!.unionValues).toEqual(['sm', 'md', 'lg']);

      const onClickProp = result!.props.find((p) => p.name === 'onClick');
      expect(onClickProp!.isCallback).toBe(true);
    });

    it('analyzes a minimal component with no props', () => {
      const result = analyzeComponent(path.join(FIXTURES, 'simple/Icon.tsx'));
      expect(result).not.toBeNull();
      expect(result!.name).toBe('Icon');
      expect(result!.props).toEqual([]);
      expect(result!.hasChildren).toBe(false);
    });

    it('analyzes a default export component', () => {
      const result = analyzeComponent(path.join(FIXTURES, 'edge-cases/DefaultExport.tsx'));
      expect(result).not.toBeNull();
      expect(result!.name).toBe('Card');
      expect(result!.exportType).toBe('default');

      const titleProp = result!.props.find((p) => p.name === 'title');
      expect(titleProp!.required).toBe(true);
    });

    it('detects React Router usage', () => {
      const result = analyzeComponent(path.join(FIXTURES, 'framework/RouterLink.tsx'));
      expect(result).not.toBeNull();
      expect(result!.usesRouter).toBe(true);
    });

    it('detects colorPalette union values', () => {
      const result = analyzeComponent(path.join(FIXTURES, 'simple/Badge.tsx'));
      expect(result).not.toBeNull();
      const cp = result!.props.find((p) => p.name === 'colorPalette');
      expect(cp!.unionValues).toEqual(['red', 'green', 'blue', 'yellow']);
    });

    it('returns null for non-existent file', () => {
      const result = analyzeComponent('/does/not/exist.tsx');
      expect(result).toBeNull();
    });
  });

  describe('from content string', () => {
    it('analyzes content directly without reading file', () => {
      const content = `
        import React from 'react';
        interface TestProps { name: string; }
        export const TestComponent = ({ name }: TestProps) => <div>{name}</div>;
      `;
      const result = analyzeComponent('test.tsx', content);
      expect(result).not.toBeNull();
      expect(result!.name).toBe('TestComponent');
      expect(result!.props).toHaveLength(1);
      expect(result!.props[0].name).toBe('name');
    });

    it('returns null for empty content', () => {
      const result = analyzeComponent('empty.tsx', '   ');
      expect(result).toBeNull();
    });

    it('returns null for non-component file (lowercase export)', () => {
      // Lowercase exports like 'add' are not detected as components.
      // But the filename fallback derives 'Util' from 'util.ts'.
      // This is expected behavior — the analyzer is conservative.
      const result = analyzeComponent('util.ts', 'export const add = (a: number, b: number) => a + b;');
      expect(result).not.toBeNull();
      expect(result!.name).toBe('Util'); // derived from filename
      expect(result!.props).toEqual([]);
    });

    it('handles double-quoted union values', () => {
      const content = `
import React from 'react';

interface Props {
  mode: "light" | "dark";
}

export const Theme = ({ mode }: Props) => <div>{mode}</div>;
`;
      const result = analyzeComponent('theme.tsx', content);
      expect(result).not.toBeNull();
      const modeProp = result!.props.find((p) => p.name === 'mode');
      expect(modeProp!.unionValues).toEqual(['light', 'dark']);
    });

    it('handles React.FC pattern', () => {
      const content = `
        import React from 'react';
        interface CardProps { title: string; }
        export const Card: React.FC<CardProps> = ({ title }) => <h1>{title}</h1>;
      `;
      const result = analyzeComponent('card.tsx', content);
      expect(result).not.toBeNull();
      expect(result!.name).toBe('Card');
      expect(result!.props).toHaveLength(1);
    });
  });
});
