---
name: forgekit-storybook-plugin
description: Auto-generate Storybook stories, interaction tests, Playwright component tests, and accessibility audits for React components. Use when the user asks to "generate stories", "add storybook stories", "create stories for my components", "check story coverage", or wants to scaffold Storybook files from existing React components.
---

# ForgeKit Storybook Plugin

Auto-generate Storybook stories from React component analysis. Analyzes props, callbacks, union types, and features to produce complete `.stories.tsx` files with controls, variants, interaction tests, and a11y audits.

## When to Use This Skill

Use when the user:

- Asks to generate Storybook stories for a component or directory
- Wants interaction tests or a11y audits added to stories
- Asks to check story coverage across their components
- Wants Playwright component tests generated
- Says things like "add stories", "generate stories", "scaffold storybook", "story coverage"
- Wants to watch a directory and auto-generate stories on change

## Prerequisites

The package must be installed in the user's project:

```bash
npm install -D @effinrich/forgekit-storybook-plugin
```

If not installed, install it first. No other configuration is needed.

## Commands

### Generate a story for a single component

```bash
npx forgekit-storybook-plugin story <path> [options]
```

Options:
- `--story-title <title>` — Custom Storybook title (auto-inferred by default)
- `--skip-interaction-tests` — Skip generating play functions
- `--overwrite` — Overwrite existing story file
- `--dry-run` — Preview output without writing files

Example:
```bash
npx forgekit-storybook-plugin story src/components/Button.tsx
npx forgekit-storybook-plugin story src/components/Button.tsx --dry-run
npx forgekit-storybook-plugin story src/components/Button.tsx --overwrite --skip-interaction-tests
```

### Generate stories for all components in a directory

```bash
npx forgekit-storybook-plugin stories <dir> [options]
```

Options:
- `--skip-interaction-tests` — Skip generating play functions
- `--overwrite` — Overwrite existing story files
- `--dry-run` — Preview without writing files
- `--include-tests` — Also generate Playwright component tests

Example:
```bash
npx forgekit-storybook-plugin stories src/components/
npx forgekit-storybook-plugin stories src/components/ --include-tests --overwrite
```

### Generate a Playwright component test

```bash
npx forgekit-storybook-plugin test <path> [options]
```

Options:
- `--overwrite` — Overwrite existing test file
- `--dry-run` — Preview without writing files

### Watch and auto-generate stories

```bash
npx forgekit-storybook-plugin watch <dir> [options]
```

Options:
- `--skip-interaction-tests` — Skip generating play functions
- `--debounce <ms>` — Debounce interval (default: 300ms)

### Check story coverage

```bash
npx forgekit-storybook-plugin coverage <dir> [options]
```

Options:
- `--json` — Output results as JSON

Coverage grades: A (≥90%) · B (≥75%) · C (≥50%) · D (≥25%) · F (<25%)

### Check prerequisites

```bash
npx forgekit-storybook-plugin init
```

## What Gets Generated

For a typical component with variants, sizes, and callbacks — **18+ stories**:

- **Default** — component with default props
- **Sizes/Variants/ColorPalettes** — all union values side by side
- **Per-value stories** (SizeSm, SizeMd, VariantPrimary, etc.)
- **Boolean prop stories** (Loading, FullWidth, etc.)
- **WithChildren** — custom child content
- **AllCombinations** — size × variant grid
- **DisabledInteractive** — disabled with bound handler
- **LongText** — overflow/wrapping stress test
- **ClickInteraction** — click fires handler
- **KeyboardNavigation** — tab focus + enter triggers
- **RendersCorrectly** — mounts without crashing
- **AccessibilityAudit** — axe-core a11y check

## Decision Guide

| User wants | Command |
|---|---|
| Stories for one component | `story <path>` |
| Stories for a whole directory | `stories <dir>` |
| Just check what's missing | `coverage <dir>` |
| Preview before writing | Add `--dry-run` |
| Playwright tests too | `stories <dir> --include-tests` |
| Auto-regen on save | `watch <dir>` |
| Skip play functions | Add `--skip-interaction-tests` |

## Important Notes

- Always use `--dry-run` first if the user seems unsure or wants to preview
- Use `--overwrite` only when the user explicitly wants to replace existing stories
- The tool only generates stories for `.tsx` and `.jsx` files with React components
- Components without analyzable props still get Default, RendersCorrectly, and AccessibilityAudit stories
