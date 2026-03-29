# ForgeKit — Technical Plan

> Architecture, implementation strategy, and engineering decisions for decoupling the ForgeKit Storybook engine from Nx and shipping it as a universal npm module.

---

## Table of Contents

1. [Existing Codebase Analysis](#1-existing-codebase-analysis)
2. [Architecture Design](#2-architecture-design)
3. [Nx Decoupling Strategy](#3-nx-decoupling-strategy)
4. [Module Structure](#4-module-structure)
5. [Core Engine Design](#5-core-engine-design)
6. [CLI Design](#6-cli-design)
7. [Programmatic API](#7-programmatic-api)
8. [Phase 2: MCP Server](#8-phase-2-mcp-server)
9. [Phase 2: Claude Code Skill](#9-phase-2-claude-code-skill)
10. [Error & Rescue Map](#10-error--rescue-map)
11. [Test Strategy](#11-test-strategy)
12. [Build & Publish](#12-build--publish)
13. [Migration Path (Nx plugin)](#13-migration-path-nx-plugin)
14. [Implementation Sequence](#14-implementation-sequence)
15. [Technical Debt from Nx Plugin](#15-technical-debt-from-nx-plugin)
16. [Deferred Work](#16-deferred-work)

---

## 1. Existing Codebase Analysis

### Source Stats (from @effinrich/forgekit-nx-storybook)

| Layer | Files | Lines | Nx-Coupled? |
|---|---|---|---|
| Core engine (analysis + generation) | 4 | 1,011 | Lightly (Tree.read only) |
| Generators (story, stories, component-test, init) | 4 | 807 | Heavily |
| Executor (watch) | 1 | 202 | Heavily |
| Utilities (types, constants, UI) | 3 | 208 | No |
| Tests | 8 | 1,618 | Via @nx/devkit/testing |
| **Total** | **20** | **3,846** | |

### Nx API Usage Map

```
                    Nx APIs Used
                    ────────────
  Tree.read()  ─────────────────────── analyze-component.ts
  Tree.write() ─────────────────────── story/generator.ts, component-test/generator.ts
  Tree.exists() ────────────────────── story/generator.ts, component-test/generator.ts
  Tree.children() / Tree.isFile() ──── stories/generator.ts (directory walk)
  formatFiles() ────────────────────── all generators
  readProjectConfiguration() ───────── stories/generator.ts
  getProjects() ────────────────────── stories/generator.ts, init/generator.ts
  readJson() / updateJson() ────────── init/generator.ts
  workspaceRoot ────────────────────── watch/executor.ts
  ExecutorContext ───────────────────── watch/executor.ts
  FsTree ───────────────────────────── watch/executor.ts
  logger ───────────────────────────── imported but unused (dead code)
```

### What's Reusable As-Is

| File | Reusable? | Changes Needed |
|---|---|---|
| `analyze-component.ts` | 95% | Replace `Tree.read()` with `fs.readFileSync()` |
| `generate-story-content.ts` | 100% | None — pure function, takes ComponentAnalysis, returns string |
| `generate-interaction-tests.ts` | 100% | None — pure function |
| `generate-playwright-test.ts` | 100% | None — pure function |
| `utils/types.ts` | 100% | None |
| `utils/constants.ts` | 100% | None |
| `utils/ui.ts` | 90% | Remove Nx logger references |
| `story/generator.ts` | 40% | Replace Tree writes with fs, remove Nx project resolution |
| `stories/generator.ts` | 30% | Replace Tree walk with glob, remove readProjectConfiguration |
| `component-test/generator.ts` | 40% | Same as story/generator |
| `init/generator.ts` | 10% | Complete rewrite — no Nx init needed |
| `watch/executor.ts` | 60% | Replace FsTree/ExecutorContext with chokidar + direct fs |

---

## 2. Architecture Design

### Current (Nx Plugin)

```
  User ──► nx generate ──► Nx Generator API ──► Tree (virtual fs)
                               │
                               ▼
                          Core Engine
                     ┌─────────────────┐
                     │ analyzeComponent │◄── Tree.read()
                     │ generateStory    │
                     │ generateTests    │
                     │ generatePW       │
                     └────────┬────────┘
                              │
                              ▼
                     Tree.write() ──► formatFiles() ──► Disk
```

### New (Universal npm Module)

```
  ┌─────────────────────────────────────────────────────────────┐
  │                        FORGEKIT                              │
  │                                                              │
  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
  │  │   CLI    │  │  Prog.   │  │   MCP    │  │   Claude   │  │
  │  │ (yargs)  │  │   API    │  │  Server  │  │   Code     │  │
  │  │          │  │          │  │ (Phase 2)│  │   Skill    │  │
  │  │ forgekit │  │ import { │  │          │  │ (Phase 2)  │  │
  │  │ story    │  │  forge   │  │ generate │  │            │  │
  │  │ stories  │  │ } from   │  │ -story   │  │ forgekit:  │  │
  │  │ test     │  │ 'forge-  │  │ analyze  │  │ story      │  │
  │  │ watch    │  │  kit'    │  │ -comp    │  │ forgekit:  │  │
  │  │ coverage │  │          │  │ coverage │  │ coverage   │  │
  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └─────┬──────┘  │
  │       │              │              │               │        │
  │       └──────────────┴──────┬───────┴───────────────┘        │
  │                             │                                │
  │                    ┌────────▼────────┐                       │
  │                    │  FileSystem     │                       │
  │                    │  Abstraction    │                       │
  │                    │  Layer (FSAL)   │                       │
  │                    └────────┬────────┘                       │
  │                             │                                │
  │                    ┌────────▼────────┐                       │
  │                    │  Core Engine    │                       │
  │                    ├─────────────────┤                       │
  │                    │ analyzeComponent│                       │
  │                    │ generateStory   │                       │
  │                    │ generateTests   │                       │
  │                    │ generatePWTest  │                       │
  │                    │ scanDirectory   │                       │
  │                    │ scoreCoverage   │                       │
  │                    └─────────────────┘                       │
  │                                                              │
  │                    ┌─────────────────┐                       │
  │                    │  Utilities      │                       │
  │                    ├─────────────────┤                       │
  │                    │ types           │                       │
  │                    │ constants       │                       │
  │                    │ ui (terminal)   │                       │
  │                    │ config (.forgekit│                       │
  │                    │  rc)            │                       │
  │                    └─────────────────┘                       │
  └─────────────────────────────────────────────────────────────┘
         │                                           │
         ▼                                           ▼
   fs.readFileSync()                          fs.writeFileSync()
   glob / fast-glob                           prettier (optional)
```

### Key Architectural Decision: FileSystem Abstraction Layer

The Nx plugin uses `Tree` (a virtual filesystem). Instead of coupling directly to `fs`, introduce a thin abstraction:

```typescript
interface ForgeFS {
  readFile(path: string): string;
  writeFile(path: string, content: string): void;
  exists(path: string): boolean;
  listFiles(dir: string, pattern?: string): string[];
  isFile(path: string): boolean;
}
```

**Why:** This enables:
- Default implementation uses Node `fs` + `fast-glob` (works everywhere)
- Test implementation uses in-memory map (fast, no disk I/O)
- Future Nx wrapper can adapt Nx's Tree to this interface
- MCP server can use the same core with custom FS

**This is NOT over-engineering** — it's a direct replacement for Nx's Tree that the existing code already depends on. The interface is 5 methods.

---

## 3. Nx Decoupling Strategy

### Replacement Map

| Nx API | Replacement | Notes |
|---|---|---|
| `Tree.read(path)` | `fs.readFileSync(path, 'utf-8')` | Via FSAL |
| `Tree.write(path, content)` | `fs.writeFileSync(path, content)` | Via FSAL |
| `Tree.exists(path)` | `fs.existsSync(path)` | Via FSAL |
| `Tree.children(dir)` | `fs.readdirSync(dir)` | Via FSAL |
| `Tree.isFile(path)` | `fs.statSync(path).isFile()` | Via FSAL |
| `formatFiles(tree)` | `prettier.format()` (optional) | Only if prettier is installed |
| `readProjectConfiguration()` | Removed — not needed | Components found by glob |
| `getProjects()` | Removed — not needed | No Nx project concept |
| `readJson()` / `updateJson()` | `JSON.parse(fs.readFileSync())` | Only for package.json reads |
| `workspaceRoot` | `process.cwd()` or explicit `--cwd` flag | CLI provides context |
| `ExecutorContext` | Removed | Watch mode uses chokidar |
| `FsTree` | Removed | Direct fs operations |
| `logger` | `console` + chalk (already the case) | Dead import removed |

### Component Discovery (replaces Nx project scanning)

The Nx plugin uses `readProjectConfiguration()` to find a project's `sourceRoot`, then walks it. The universal version uses glob:

```typescript
// Old (Nx)
const project = readProjectConfiguration(tree, projectName);
const files = findComponentFiles(tree, project.sourceRoot);

// New (universal)
const files = await glob('**/*.{tsx,ts}', {
  cwd: targetDir,
  ignore: ['**/*.spec.*', '**/*.test.*', '**/*.stories.*',
           '**/node_modules/**', '**/dist/**', '**/.storybook/**'],
});
```

### Story Title Inference (replaces Nx project-based titles)

The Nx plugin infers titles from project structure (`libs/portal/ui/...`). The universal version:

1. Uses relative path from target directory
2. Strips `src/`, `lib/`, `components/` prefixes
3. Converts directory segments to PascalCase
4. Example: `src/components/forms/TextInput/TextInput.tsx` → `"Forms / TextInput"`

---

## 4. Module Structure

```
forgekit/
├── src/
│   ├── index.ts                          # Public API exports
│   ├── cli/
│   │   ├── index.ts                      # CLI entry point (yargs)
│   │   ├── commands/
│   │   │   ├── story.ts                  # forgekit story <path>
│   │   │   ├── stories.ts               # forgekit stories <dir>
│   │   │   ├── test.ts                   # forgekit test <path>
│   │   │   ├── watch.ts                  # forgekit watch <dir>
│   │   │   ├── coverage.ts              # forgekit coverage <dir>
│   │   │   └── init.ts                   # forgekit init
│   │   └── ui.ts                         # Terminal output (chalk)
│   ├── core/
│   │   ├── analyze-component.ts          # Component analysis (from Nx plugin)
│   │   ├── generate-story-content.ts     # Story generation (from Nx plugin)
│   │   ├── generate-interaction-tests.ts # Interaction tests (from Nx plugin)
│   │   ├── generate-playwright-test.ts   # Playwright tests (from Nx plugin)
│   │   ├── scan-directory.ts             # Directory scanning (replaces Nx project walk)
│   │   ├── score-coverage.ts             # Coverage scoring (extracted from stories generator)
│   │   └── infer-title.ts               # Story title inference (extracted + generalized)
│   ├── fs/
│   │   ├── types.ts                      # ForgeFS interface
│   │   ├── node-fs.ts                    # Node.js fs implementation
│   │   └── memory-fs.ts                  # In-memory implementation (for tests)
│   ├── config/
│   │   ├── load-config.ts                # .forgekitrc / forgekit.config.ts loader
│   │   └── types.ts                      # Config schema types
│   └── utils/
│       ├── types.ts                      # ComponentAnalysis, PropInfo, etc.
│       ├── constants.ts                  # File patterns, framework imports
│       └── format.ts                     # Optional prettier integration
├── bin/
│   └── forgekit.js                       # #!/usr/bin/env node entry
├── package.json
├── tsconfig.json
├── tsup.config.ts                        # Build config (tsup for bundling)
├── vitest.config.ts                      # Test config
└── .forgekitrc.example                   # Example config
```

---

## 5. Core Engine Design

### 5.1 Component Analyzer

The analyzer is the crown jewel. It's currently regex-based (fragile but fast). The plan:

**Phase 1: Port regex-based analyzer as-is**

The existing regex patterns handle ~80% of common React components. Ship what works.

```typescript
// Public API
export function analyzeComponent(filePath: string, content?: string): ComponentAnalysis | null

// If content not provided, reads from disk
// Returns null if no exported component found
```

Key extraction pipeline:
```
  File Content
       │
       ▼
  extractComponentName()    ──► name, exportType
       │
       ▼
  extractImports()          ──► ImportInfo[] (source, specifiers)
       │
       ▼
  findPropsTypeName()       ──► "ButtonProps" | null
       │
       ▼
  extractProps()            ──► PropInfo[] (name, type, required, callback, union)
       │
       ▼
  detectFrameworks()        ──► usesRouter, usesChakra, usesReactQuery
       │
       ▼
  ComponentAnalysis
```

**Phase 1.5: Fix known regex limitations**

| Issue | Current Behavior | Fix |
|---|---|---|
| Intersection types (`Props & BaseProps`) | Fails to extract | Match `{` accounting for `&` |
| Double-quoted unions (`"a" \| "b"`) | Not matched | Extend regex to handle `"` |
| Generic components (`Select<T>`) | Fails | Strip generic params before matching |
| Enum types | Not detected as unions | Resolve enum → literal union |
| Re-exported components | May miss | Check for `export { X } from` |

**Phase 2: TypeScript Compiler API migration (deferred)**

Replace regex with `ts.createSourceFile()` + AST walking for reliable extraction. This is a larger effort but eliminates all edge cases.

### 5.2 Story Generator

Pure function — no changes needed from Nx plugin. Takes `ComponentAnalysis`, returns string.

```typescript
export function generateStoryContent(options: {
  analysis: ComponentAnalysis;
  importPath: string;
  storyTitle?: string;
  skipInteractionTests?: boolean;
}): string
```

### 5.3 Directory Scanner (new)

Replaces Nx's `findComponentFiles()` + `readProjectConfiguration()`:

```typescript
export async function scanDirectory(dir: string, options?: ScanOptions): Promise<ScanResult> {
  // 1. Glob for .tsx/.ts files
  // 2. Filter out non-component files (specs, tests, stories, styles, index)
  // 3. Analyze each component
  // 4. Classify: hasStory / needsStory / notAnalyzable
  // 5. Score coverage (A-F)
  return { components, coverage, grade };
}
```

### 5.4 Watch Mode (rewritten)

Replace Nx executor + `fs.watch()` with chokidar:

```typescript
export function watchDirectory(dir: string, options?: WatchOptions): WatchHandle {
  // Uses chokidar for reliable cross-platform file watching
  // Debounced (configurable, default 300ms)
  // Returns handle with .close() for cleanup
  // Emits events: 'generate', 'update', 'error', 'ready'
}
```

**Why chokidar over fs.watch:**
- `fs.watch` is unreliable on macOS (double events, missing events)
- chokidar handles recursive watching, glob ignore, atomic writes
- The Nx plugin already had issues with `fs.watch` that chokidar solves

---

## 6. CLI Design

### Command Structure

```
forgekit <command> [options]

Commands:
  forgekit story <path>        Generate a story for one component
  forgekit stories <dir>       Bulk generate stories for a directory
  forgekit test <path>         Generate Playwright component test
  forgekit watch <dir>         Watch and auto-generate on changes
  forgekit coverage <dir>      Report story coverage without generating
  forgekit init                Check prerequisites and show setup guide

Options:
  --skip-interaction-tests     Skip generating play functions
  --skip-a11y                  Skip accessibility audit stories
  --overwrite                  Overwrite existing story/test files
  --dry-run                    Preview without writing files
  --include-tests              Also generate Playwright tests (with stories)
  --cwd <path>                 Working directory (default: process.cwd())
  --config <path>              Path to config file
  --quiet                      Suppress non-essential output
  --json                       Output results as JSON (for programmatic use)
  --version                    Show version
  --help                       Show help
```

### CLI Framework: yargs

**Why yargs:**
- Mature, well-documented, widely used
- Built-in help generation, completion, strict mode
- Supports command modules pattern (one file per command)
- Already used by Storybook CLI — familiar to target audience

### Example Usage

```bash
# Single component
npx forgekit story src/components/Button/Button.tsx

# All components in a directory
npx forgekit stories src/components/

# Coverage report only (no generation)
npx forgekit coverage src/components/

# Watch mode
npx forgekit watch src/components/ --skip-a11y

# Dry run
npx forgekit stories src/components/ --dry-run

# Playwright test
npx forgekit test src/components/Button/Button.tsx

# JSON output (for CI/scripts)
npx forgekit coverage src/components/ --json
```

---

## 7. Programmatic API

### Public Exports (src/index.ts)

```typescript
// Core analysis
export { analyzeComponent } from './core/analyze-component';
export { scanDirectory } from './core/scan-directory';

// Generation
export { generateStoryContent } from './core/generate-story-content';
export { generateInteractionTests } from './core/generate-interaction-tests';
export { generatePlaywrightTest } from './core/generate-playwright-test';

// Coverage
export { scoreCoverage } from './core/score-coverage';

// Watch
export { watchDirectory } from './core/watch';

// High-level orchestration
export { forgeStory } from './api/forge-story';      // analyze + generate + write
export { forgeStories } from './api/forge-stories';   // scan + generate all + report
export { forgeTest } from './api/forge-test';          // analyze + generate test + write

// Types
export type {
  ComponentAnalysis,
  PropInfo,
  ImportInfo,
  ScanResult,
  CoverageReport,
  ForgeKitConfig,
} from './utils/types';
```

### Usage Example

```typescript
import { analyzeComponent, generateStoryContent } from 'forgekit';

const analysis = analyzeComponent('src/Button.tsx');
if (analysis) {
  const story = generateStoryContent({
    analysis,
    importPath: './Button',
    storyTitle: 'UI / Button',
  });
  fs.writeFileSync('src/Button.stories.tsx', story);
}
```

---

## 8. Phase 2: MCP Server

### Tools Exposed

| Tool | Input | Output |
|---|---|---|
| `analyze-component` | `{ path: string }` | `ComponentAnalysis` JSON |
| `generate-story` | `{ path: string, options?: StoryOptions }` | Generated .stories.tsx content |
| `generate-test` | `{ path: string }` | Generated .ct.tsx content |
| `scan-directory` | `{ dir: string }` | `ScanResult` with coverage |
| `coverage-report` | `{ dir: string }` | Coverage grade + breakdown |

### Transport

- **stdio** (default) — for local AI agents (Claude Code, Cursor, etc.)
- **HTTP** (optional) — for remote/cloud AI agents

### Implementation

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { analyzeComponent, scanDirectory } from 'forgekit';

const server = new Server({ name: 'forgekit', version: '1.0.0' }, {
  capabilities: { tools: {} }
});

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'analyze-component',
      description: 'Analyze a React component file and extract props, imports, framework usage',
      inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] }
    },
    // ... other tools
  ]
}));
```

### Package Strategy

Two options:
- **A) Separate package** — `forgekit-mcp` depends on `forgekit`
- **B) Built into forgekit** — `forgekit mcp` CLI command starts the server

Recommend **B** — keeps it simple, one install. The MCP server code is <200 lines.

---

## 9. Phase 2: Claude Code Skill

### Skill Definition

```
forgekit:story    — Generate story for a component (triggers on .tsx edits)
forgekit:stories  — Bulk generate for a directory
forgekit:test     — Generate Playwright test
forgekit:coverage — Report coverage
```

### Hook Integration

```json
{
  "PreToolUse": [{
    "matcher": "Edit|Write",
    "hooks": [{
      "type": "command",
      "command": "node forgekit-skill-hook.mjs"
    }]
  }]
}
```

The skill hook matches `.tsx` file edits and suggests running `forgekit story` on the edited component.

---

## 10. Error & Rescue Map

### Core Engine Errors

```
METHOD/CODEPATH              | WHAT CAN GO WRONG              | ERROR TYPE
-----------------------------|--------------------------------|--------------------
analyzeComponent(path)       | File doesn't exist             | FileNotFoundError
                             | File is empty                  | EmptyFileError
                             | Not a React component          | Returns null (expected)
                             | Binary file / not UTF-8        | EncodingError
                             | Props regex fails (complex TS) | Returns props: [] (degraded)
                             |                                |
generateStoryContent(...)    | analysis is null/undefined     | TypeError (prevented by caller)
                             | importPath is wrong            | Generated code won't compile
                             |                                | (user-visible, not runtime error)
                             |                                |
scanDirectory(dir)           | Directory doesn't exist        | DirectoryNotFoundError
                             | Permission denied              | PermissionError
                             | 10,000+ files (large monorepo) | Performance degradation
                             | Symlink loops                  | fast-glob handles (followSymlinks: false)
                             |                                |
watchDirectory(dir)          | Directory doesn't exist        | DirectoryNotFoundError
                             | FSEvents limit (macOS, >256)   | TooManyWatchersError
                             | File deleted while processing  | Caught, logged, skipped
                             | Permission denied on write     | WritePermissionError
                             |                                |
writeStory(path, content)    | Parent dir doesn't exist       | Create recursively (mkdirSync)
                             | File locked by editor          | Retry once after 100ms
                             | Disk full                      | DiskFullError (system)

ERROR TYPE               | RESCUED? | RESCUE ACTION              | USER SEES
-------------------------|----------|----------------------------|---------------------------
FileNotFoundError        | Y        | Log + skip                 | "Component not found: <path>"
EmptyFileError           | Y        | Log + skip                 | "Skipped empty file: <path>"
Returns null             | Y        | Skip (no component found)  | "No exported component found"
EncodingError            | Y        | Skip                       | "Skipped binary/non-UTF-8 file"
DirectoryNotFoundError   | Y        | Exit with code 1           | "Directory not found: <dir>"
PermissionError          | Y        | Exit with code 1           | "Permission denied: <path>"
TooManyWatchersError     | Y        | Warn, suggest fewer paths  | "Too many watchers — try..."
WritePermissionError     | Y        | Exit with code 1           | "Cannot write to: <path>"
Performance degradation  | Y        | Warn if >1000 files        | "Found N files, this may be slow"
```

### CLI Errors

```
METHOD/CODEPATH              | WHAT CAN GO WRONG              | USER SEES
-----------------------------|--------------------------------|---------------------------
No command given             | Missing required arg           | Help text
Invalid path                 | Path doesn't exist             | "File not found: <path>"
No components found          | Dir exists but no .tsx files   | "No React components found in <dir>"
All stories exist            | Nothing to generate            | "All N components already have stories"
Config parse error           | Invalid .forgekitrc            | "Config error in .forgekitrc: <details>"
```

---

## 11. Test Strategy

### Test Pyramid

```
                    ┌───────┐
                    │  E2E  │  3-5 tests
                    │ (CLI) │  npx forgekit story ... → verify file output
                    ├───────┤
                 ┌──┤ Integ ├──┐  15-20 tests
                 │  │       │  │  scan + analyze + generate pipeline
                 │  ├───────┤  │
              ┌──┤  │ Unit  │  ├──┐  80+ tests
              │  │  │       │  │  │  Individual functions
              │  │  └───────┘  │  │
              └──┴─────────────┴──┘
```

### Unit Tests (vitest)

| Module | Tests | What's Tested |
|---|---|---|
| `analyze-component` | ~25 | Prop extraction, import detection, framework flags, edge cases |
| `generate-story-content` | ~20 | Meta generation, argTypes, controls, variants, disabled |
| `generate-interaction-tests` | ~15 | Play functions, click, keyboard, a11y, render |
| `generate-playwright-test` | ~15 | Mount, screenshot, interaction, disabled, a11y |
| `scan-directory` | ~10 | Glob patterns, filtering, classification |
| `score-coverage` | ~5 | Grade boundaries (A-F) |
| `infer-title` | ~10 | Path-to-title conversion edge cases |
| `config/load-config` | ~5 | Config file loading, merging, defaults |

### Integration Tests

| Scenario | What's Tested |
|---|---|
| Full pipeline: file → analyze → generate → output | End-to-end content generation |
| Bulk scan: directory → scan → generate all | Multi-file orchestration |
| Watch mode: file change → debounce → generate | Watcher + generation pipeline |
| Config: .forgekitrc → merged options → output | Config loading + application |

### E2E Tests

| Scenario | What's Tested |
|---|---|
| `npx forgekit story fixture/Button.tsx` | CLI → file written → content correct |
| `npx forgekit stories fixture/` | CLI → multiple files → coverage report |
| `npx forgekit coverage fixture/ --json` | JSON output parseable + accurate |

### Test Fixtures

Create a `test/fixtures/` directory with real-world-like components:

```
test/fixtures/
├── simple/
│   ├── Button.tsx              # Basic: label, onClick, disabled, variant
│   ├── Badge.tsx               # Minimal: children only
│   └── Icon.tsx                # No props
├── complex/
│   ├── DataTable.tsx           # Many props, generics, complex types
│   ├── Form.tsx                # React Hook Form integration
│   └── Modal.tsx               # Portal, useEffect, event listeners
├── framework/
│   ├── RouterLink.tsx          # react-router imports
│   ├── ChakraButton.tsx        # @chakra-ui/react imports
│   └── QueryList.tsx           # @tanstack/react-query imports
├── edge-cases/
│   ├── ForwardRef.tsx          # React.forwardRef
│   ├── MemoComponent.tsx       # React.memo
│   ├── DefaultExport.tsx       # export default function
│   ├── ReExported.tsx          # export { X } from './X'
│   ├── StyledComponent.tsx     # styled-components
│   └── GenericSelect.tsx       # Select<T>
└── existing/
    ├── WithStory.tsx           # Has .stories.tsx already
    └── WithStory.stories.tsx   # Pre-existing story
```

---

## 12. Build & Publish

### Build Tool: tsup

**Why tsup:**
- Zero-config TypeScript bundling
- Outputs both ESM and CJS
- Generates .d.ts declarations
- Tree-shakeable
- Used by shadcn/ui, tRPC, and many modern npm packages

```typescript
// tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    cli: 'src/cli/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  splitting: true,
  sourcemap: true,
});
```

### package.json Key Fields

```json
{
  "name": "forgekit",
  "version": "1.0.0",
  "description": "Auto-generate Storybook stories, interaction tests, and accessibility audits from React component analysis",
  "bin": {
    "forgekit": "./bin/forgekit.js"
  },
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist", "bin"],
  "engines": { "node": ">=18.17.1" },
  "peerDependencies": {
    "storybook": ">=8.0.0",
    "typescript": ">=5.0.0"
  },
  "peerDependenciesMeta": {
    "storybook": { "optional": true },
    "typescript": { "optional": true }
  },
  "dependencies": {
    "chalk": "^5.3.0",
    "chokidar": "^3.6.0",
    "fast-glob": "^3.3.0",
    "yargs": "^17.7.0"
  },
  "optionalDependencies": {
    "@playwright/experimental-ct-react": ">=1.40.0",
    "@axe-core/playwright": ">=4.8.0"
  }
}
```

---

## 13. Migration Path (Nx Plugin)

Once `forgekit` is stable, the Nx plugin becomes a thin wrapper:

```typescript
// Future @effinrich/forgekit-nx-storybook (v1.0)
import { analyzeComponent, generateStoryContent, forgeStory } from 'forgekit';

export function storyGenerator(tree: Tree, options: StoryGeneratorSchema) {
  const content = tree.read(options.componentPath, 'utf-8');
  const analysis = analyzeComponent(options.componentPath, content);
  if (!analysis) return;

  const story = generateStoryContent({ analysis, importPath: '...' });
  tree.write(storyPath, story);
  formatFiles(tree);
}
```

The Nx plugin becomes ~50 lines per generator instead of ~200. All logic lives in `forgekit`.

---

## 14. Implementation Sequence

### Build Order (dependency-driven)

```
Week 1: Foundation
────────────────────────────────────────────────
  ① utils/types.ts, utils/constants.ts        (copy from Nx plugin)
  ② fs/types.ts, fs/node-fs.ts, fs/memory-fs.ts  (new, thin layer)
  ③ core/analyze-component.ts                  (port, replace Tree.read)
  ④ core/analyze-component.spec.ts             (port + expand tests)

Week 2: Generation
────────────────────────────────────────────────
  ⑤ core/generate-story-content.ts             (copy as-is)
  ⑥ core/generate-interaction-tests.ts         (copy as-is)
  ⑦ core/generate-playwright-test.ts           (copy as-is)
  ⑧ Tests for ⑤⑥⑦                             (port from Nx plugin)

Week 3: Orchestration
────────────────────────────────────────────────
  ⑨ core/scan-directory.ts                     (new, replaces Nx project walk)
  ⑩ core/score-coverage.ts                     (extract from stories generator)
  ⑪ core/infer-title.ts                        (extract + generalize)
  ⑫ api/forge-story.ts, forge-stories.ts, forge-test.ts  (high-level orchestrators)

Week 4: CLI + Watch
────────────────────────────────────────────────
  ⑬ cli/commands/*.ts                          (yargs commands)
  ⑭ core/watch.ts                              (chokidar-based, replaces Nx executor)
  ⑮ cli/ui.ts                                  (port + clean up)
  ⑯ bin/forgekit.js                            (entry point)

Week 5: Polish + Publish
────────────────────────────────────────────────
  ⑰ Build config (tsup, vitest)
  ⑱ E2E tests with fixtures
  ⑲ README.md
  ⑳ npm publish
```

### Critical Path

```
  types ──► analyze-component ──► generate-* ──► forge-story ──► CLI
                                                     │
                                              scan-directory ──► forge-stories ──► CLI
                                                     │
                                                   watch ──► CLI
```

The core engine (steps ①-⑧) has zero external dependencies beyond Node.js built-ins. CLI (⑬-⑯) adds yargs + chalk. Watch (⑭) adds chokidar.

---

## 15. Technical Debt from Nx Plugin

Issues to fix during port (not deferred — fix them now while touching the code):

| # | Issue | Severity | Fix During Port |
|---|---|---|---|
| 1 | Regex can't parse intersection types (`Props & Base`) | High | Extend regex to handle `&` before `{` |
| 2 | Only single-quoted unions (`'a' \| 'b'`) detected | Medium | Support double-quoted unions too |
| 3 | Story title inference hardcoded to specific paths | High | Generalize to relative-path-based inference |
| 4 | `logger` imported but never used | Low | Remove dead import |
| 5 | Test fixtures duplicated across spec files | Medium | Shared fixtures directory |
| 6 | `fs.watch()` unreliable on macOS | High | Use chokidar |
| 7 | No support for `React.forwardRef` | Medium | Detect and unwrap forwardRef |
| 8 | No support for `React.memo` | Medium | Detect and unwrap memo |
| 9 | Framework detection has false positives | Low | Check symbol usage, not just import |

Issues to defer:
| # | Issue | Severity | Why Defer |
|---|---|---|---|
| 10 | Regex → TypeScript Compiler API | Medium | Major rewrite, regex works for 80% of cases |
| 11 | No JSDoc extraction | Low | Nice-to-have, not blocking |
| 12 | Generic components (`Select<T>`) | Medium | Rare in typical component libraries |
| 13 | styled-components detection | Low | Edge case, can add incrementally |

---

## 16. Deferred Work

| Item | Phase | Effort | Why Deferred |
|---|---|---|---|
| MCP Server | Phase 2 | M | Requires forgekit core to be stable first |
| Claude Code Skill | Phase 2 | M | Depends on MCP or direct integration |
| `.forgekitrc` config | Phase 1.5 | S | Nice-to-have, CLI flags cover Phase 1 |
| `forgekit diff` (git-aware) | Phase 1.5 | S | Useful but not core |
| Coverage badge generation | Phase 2 | S | Marketing feature |
| TypeScript Compiler API | Phase 2 | XL | Major rewrite of analyzer |
| Vue/Svelte support | Phase 3 | XL | Different parsers needed |
| CI/CD integration mode | Phase 2 | M | `--ci` flag + exit codes |
| Custom story templates | Phase 2 | M | Template engine needed |
| Auto-detect test framework | Phase 1.5 | S | Check for vitest.config or jest.config |

---

## Appendix A: Dependency Budget

### Runtime Dependencies (Phase 1)

| Package | Size | Why |
|---|---|---|
| `yargs` | 80KB | CLI argument parsing |
| `chalk` | 44KB | Terminal colors |
| `chokidar` | 15KB | File watching (watch mode only) |
| `fast-glob` | 30KB | Directory scanning |
| **Total** | **~170KB** | |

### No-dependency alternatives considered

| Instead of | Could use | Why not |
|---|---|---|
| yargs | Node.js `parseArgs` | No auto-help, no command modules, no completion |
| chalk | `node:util.styleText` (Node 21+) | Node 18 compat required |
| chokidar | `fs.watch` | Unreliable on macOS, no glob ignore |
| fast-glob | `node:fs/promises` + manual walk | Slower, more code, no glob patterns |

### Dev Dependencies

| Package | Purpose |
|---|---|
| `tsup` | Build/bundle |
| `vitest` | Test runner |
| `typescript` | Type checking |
| `prettier` | Code formatting (for generated output) |

---

## Appendix B: Framework Detection Matrix (Phase 1)

| Framework | Import Pattern | Detection | Story Effect |
|---|---|---|---|
| React Router | `react-router-dom`, `react-router` | Import source match | `withRouter` decorator |
| Chakra UI | `@chakra-ui/react` | Import source match | Flagged in report |
| React Query | `@tanstack/react-query`, `react-query` | Import source match | Flagged in report |
| Zustand | `zustand` | Import source match | Flagged in report (new) |
| Formik | `formik` | Import source match | Flagged in report (new) |
| React Hook Form | `react-hook-form` | Import source match | Flagged in report (new) |

---

## Appendix C: Coverage Grading Scale

| Grade | Range | Meaning |
|---|---|---|
| A | 90-100% | Excellent — nearly all components have stories |
| B | 75-89% | Good — most components covered |
| C | 50-74% | Fair — significant gaps |
| D | 25-49% | Poor — most components missing stories |
| F | 0-24% | Failing — very few stories exist |
