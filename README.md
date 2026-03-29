# ForgeKit

Auto-generate Storybook stories, interaction tests, Playwright component tests, and accessibility audits from React component analysis.

ForgeKit analyzes your React components — props, callbacks, union types, features — and generates complete `.stories.tsx` files with controls, variants, interaction tests, and a11y audits. No configuration required.

## Install

```bash
npm install -D forgekit
```

**Peer dependencies** (optional):

- `storybook >= 8.0.0`
- `typescript >= 5.0.0`

Run `npx forgekit init` to check prerequisites and see what's installed.

## Quick Start

```bash
# Generate a story for a single component
npx forgekit story src/components/Button.tsx

# Generate stories for every component in a directory
npx forgekit stories src/components/

# Check coverage without generating anything
npx forgekit coverage src/components/
```

## CLI Commands

### `forgekit story <path>`

Generate a Storybook story for a single React component.

```bash
npx forgekit story src/Button.tsx
npx forgekit story src/Button.tsx --dry-run
npx forgekit story src/Button.tsx --overwrite --skip-interaction-tests
```

| Option | Default | Description |
| --- | --- | --- |
| `--story-title` | auto-inferred | Custom Storybook title |
| `--skip-interaction-tests` | `false` | Skip generating play functions |
| `--overwrite` | `false` | Overwrite existing story file |
| `--dry-run` | `false` | Preview without writing files |

### `forgekit stories <dir>`

Bulk generate stories for all components in a directory.

```bash
npx forgekit stories src/components/
npx forgekit stories src/components/ --include-tests --overwrite
```

| Option | Default | Description |
| --- | --- | --- |
| `--skip-interaction-tests` | `false` | Skip generating play functions |
| `--overwrite` | `false` | Overwrite existing story files |
| `--dry-run` | `false` | Preview without writing files |
| `--include-tests` | `false` | Also generate Playwright component tests |

### `forgekit test <path>`

Generate a Playwright component test for a React component.

```bash
npx forgekit test src/Button.tsx
npx forgekit test src/Button.tsx --dry-run
```

| Option | Default | Description |
| --- | --- | --- |
| `--overwrite` | `false` | Overwrite existing test file |
| `--dry-run` | `false` | Preview without writing files |

### `forgekit watch <dir>`

Watch a directory and auto-generate stories when components change.

```bash
npx forgekit watch src/components/
npx forgekit watch src/components/ --debounce 500
```

| Option | Default | Description |
| --- | --- | --- |
| `--skip-interaction-tests` | `false` | Skip generating play functions |
| `--debounce` | `300` | Debounce interval in milliseconds |

### `forgekit coverage <dir>`

Report story coverage for a directory without generating files.

```bash
npx forgekit coverage src/components/
npx forgekit coverage src/components/ --json
```

| Option | Default | Description |
| --- | --- | --- |
| `--json` | `false` | Output results as JSON |

Coverage grades: **A** (≥ 90%) · **B** (≥ 75%) · **C** (≥ 50%) · **D** (≥ 25%) · **F** (< 25%)

### `forgekit init`

Check prerequisites and display the setup guide.

## What Gets Generated

For each component, ForgeKit can generate up to **9 Storybook stories**:

| Story | Condition | Tests |
| --- | --- | --- |
| **Default** | Always | Component with default/required props |
| **Sizes** | `size` prop with union values | All size variants side by side |
| **Variants** | `variant` prop with union values | All style variants |
| **ColorPalettes** | `colorPalette` prop with union values | All color options |
| **Disabled** | `disabled`/`isDisabled` prop | Disabled state rendering |
| **ClickInteraction** | Any `onClick`/`onPress` callback | Click fires handler |
| **KeyboardNavigation** | Any interactive callback | Tab focus + Enter triggers |
| **RendersCorrectly** | Always | Mounts without crashing |
| **AccessibilityAudit** | Always | axe-core a11y check |

And up to **7 Playwright test cases** (visual regression, interaction, accessibility).

## Programmatic API

```typescript
import {
  forgeStory,
  forgeStories,
  forgeTest,
  analyzeComponent,
  generateStoryContent,
  scoreCoverage,
  scanDirectory,
  watchDirectory,
} from 'forgekit';
```

### `forgeStory(options)`

Analyze a component, generate a story, and optionally write it to disk.

```typescript
const result = await forgeStory({
  componentPath: 'src/Button.tsx',
  overwrite: false,
  dryRun: false,
});
// result: { storyPath, content, analysis, storiesGenerated, written }
```

### `forgeStories(options)`

Bulk generate stories for all components in a directory.

```typescript
const result = await forgeStories({
  dir: 'src/components',
  includeComponentTests: true,
});
// result: { generated, failed, alreadyCovered, notAnalyzable, total, coverage, errors }
```

### `forgeTest(options)`

Generate a Playwright component test for a component.

```typescript
const result = await forgeTest({
  componentPath: 'src/Button.tsx',
});
// result: { testPath, content, analysis, written }
```

### `analyzeComponent(filePath)`

Low-level: parse a React component and extract props, imports, features, and export type.

```typescript
const analysis = analyzeComponent('src/Button.tsx');
// analysis: { componentName, props, imports, features, exportType }
```

### `scoreCoverage(covered, total)`

Calculate coverage percentage and letter grade.

```typescript
const report = scoreCoverage(8, 10);
// report: { covered: 8, total: 10, percentage: 80, grade: 'B' }
```

## Component Analysis

ForgeKit detects:

- **Props** — name, type, required, callbacks, union values (`'sm' | 'md' | 'lg'`)
- **Features** — children, React Router, React Query, Chakra UI
- **Export type** — default, named, or both
- **Patterns** — `React.forwardRef`, `React.memo`, intersection types

Controls are auto-mapped: `text`, `number`, `boolean`, `select` (for unions), `action` (for callbacks).

## Requirements

- Node.js ≥ 18.17.1
- React components (`.tsx` / `.jsx`)
- Storybook ≥ 8.0.0 (optional peer dep — CLI works without it for dry-run/analysis)

## License

MIT
