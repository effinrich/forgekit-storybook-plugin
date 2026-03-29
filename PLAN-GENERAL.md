# ForgeKit — General Plan

> Universal React component intelligence: auto-generate Storybook stories, interaction tests, Playwright component tests, and accessibility audits for any React codebase.

---

## What Is ForgeKit?

ForgeKit is an npm module that analyzes React components and automatically generates:

1. **Storybook stories** (.stories.tsx) — with controls, variants, default args
2. **Interaction tests** — click, keyboard navigation, render verification (Storybook play functions)
3. **Accessibility audits** — axe-core powered a11y stories
4. **Playwright component tests** (.ct.tsx) — visual regression, interaction, a11y

It works with **any React project using Storybook** — no Nx required.

---

## Where It Comes From

ForgeKit started as `@effinrich/forgekit-nx-storybook`, an Nx plugin that proved the concept. The Nx version works but is locked to Nx workspaces, excluding the vast majority of React projects (Vite, Next.js, CRA, Remix, etc.).

This plan decouples the proven core engine from Nx and makes it universally available.

---

## The Vision (12-Month)

```
Phase 1 (Now)          Phase 2 (Q3 2026)         Phase 3 (2027)
───────────────        ──────────────────         ─────────────
npm module + CLI       MCP Server +              Vue/Svelte support
Works on any React     Claude Code Skill         Language-agnostic
codebase               AI-enhanced generation    component intelligence
                       Coverage dashboards       CI/CD integration
                       .forgekitrc config         Badge generation
```

---

## Product Capabilities

### Core (Phase 1 — npm module)

| Capability | Description |
|---|---|
| **Single story generation** | `npx forgekit story src/Button.tsx` — analyzes one component, generates a complete .stories.tsx |
| **Bulk generation** | `npx forgekit stories src/components/` — scans a directory, generates stories for every component missing one |
| **Coverage scoring** | A-F grade showing what percentage of components have stories |
| **Playwright tests** | `npx forgekit test src/Button.tsx` — generates .ct.tsx with visual regression, interaction, a11y tests |
| **Watch mode** | `npx forgekit watch src/` — auto-regenerates stories when components change |
| **Framework detection** | Detects React Router, Chakra UI, React Query, Zustand, Formik and adapts output |
| **Programmatic API** | `import { analyzeComponent, generateStory } from 'forgekit'` — use in scripts, CI, other tools |

### What Gets Generated Per Component

Up to **9 Storybook stories**:

| Story | When Generated | What It Tests |
|---|---|---|
| Default | Always | Component with default/required props |
| Sizes | `size` prop with union values | All size variants side by side |
| Variants | `variant` prop with union values | All style variants |
| ColorPalettes | `colorPalette` prop with union values | All color options |
| Disabled | `disabled`/`isDisabled` prop | Disabled state rendering |
| ClickInteraction | Any `onClick`/`onPress` callback | Click fires handler |
| KeyboardNavigation | Any interactive callback | Tab focus + Enter triggers |
| RendersCorrectly | Always | Mounts without crashing |
| AccessibilityAudit | Always | axe-core a11y check |

Up to **7 Playwright test cases**:

| Test | Description |
|---|---|
| Mount & render | Component mounts without error |
| Visual snapshot | Default state screenshot |
| Click interaction | Click handlers fire |
| Value change | onChange/onValueChange handlers fire |
| Disabled state | Disabled screenshot + handler blocked |
| Variant regression | Screenshot per variant/size/color value |
| Accessibility | Full axe-core audit |

### Expansion (Phase 2 — MCP + Skill)

| Capability | Description |
|---|---|
| **MCP Server** | Exposes `generate-story`, `analyze-component`, `coverage-report` as MCP tools any AI agent can call |
| **Claude Code Skill** | `forgekit:story` triggers on .tsx edits; `forgekit:coverage` runs project analysis |
| **AI-enhanced generation** | Use LLM to generate smarter default values, better test scenarios, richer descriptions |
| **`.forgekitrc` config** | Team-level defaults: custom decorators, naming conventions, skip rules |
| **`forgekit diff`** | Only generate for components changed since last commit |
| **Coverage badge** | shields.io badge URL for READMEs |

### Long-term (Phase 3)

| Capability | Description |
|---|---|
| **Vue/Svelte support** | Component analysis generalized beyond React |
| **CI/CD integration** | `forgekit ci` fails build if coverage drops below threshold |
| **Auto-detect test framework** | Vitest vs Jest vs Playwright — adapt imports |
| **Custom story templates** | User-defined templates for company-specific patterns |

---

## Who It's For

| User | Pain Point | ForgeKit Solution |
|---|---|---|
| **Solo React dev** | Writing stories is tedious, so they don't | `npx forgekit stories src/` generates everything in seconds |
| **Design system team** | Need 100% story coverage across 200+ components | Bulk generation + coverage scoring + watch mode |
| **Team lead / QA** | No visibility into what's tested | Coverage grades (A-F) + CI integration |
| **Accessibility engineer** | Manual a11y audits don't scale | Every generated story includes axe-core audit |
| **AI agent / tool builder** | Need programmatic component intelligence | MCP server + programmatic API |

---

## Competitive Landscape

| Tool | What It Does | ForgeKit Advantage |
|---|---|---|
| **Storybook autodocs** | Generates docs page from component | ForgeKit generates actual stories with interaction tests, not just docs |
| **@nx/storybook** | Scaffolds Storybook config | ForgeKit generates story *content*, not config. Complementary, not competing |
| **Chromatic** | Visual regression cloud service | ForgeKit generates tests locally, runs anywhere. Complementary |
| **Storybook test-runner** | Runs existing stories as tests | ForgeKit generates the stories that test-runner then executes |
| **Manual story writing** | Developer writes each story | ForgeKit automates 80%+ of story authoring |

---

## Success Metrics

| Metric | Phase 1 Target | Phase 2 Target |
|---|---|---|
| npm weekly downloads | 500 | 5,000 |
| GitHub stars | 100 | 1,000 |
| Components analyzed correctly | 80% of common patterns | 95% |
| Time saved per component | ~15 min manual → ~5 sec generated | Same |
| Coverage grade adoption | Teams using A-F scoring | CI enforcement |

---

## Package Identity

| Attribute | Value |
|---|---|
| **npm name** | `forgekit` |
| **CLI binary** | `forgekit` |
| **GitHub repo** | `effinrich/forgekit` (or `forgekit-storybook-plugin` during dev) |
| **License** | MIT |
| **Node.js** | >= 18.17.1 |
| **Storybook** | >= 8.0.0 |
| **TypeScript** | >= 5.0.0 |

---

## Key Decisions Made

1. **Decouple from Nx** — The Nx plugin works but limits audience. The core engine (analysis + generation) is framework-agnostic. Ship it standalone.
2. **npm module first** — CLI + programmatic API as the foundation. MCP and Skill are Phase 2 layers on top.
3. **Package name: `forgekit`** — Clean, brandable, leaves room for expansion beyond Storybook.
4. **Existing Nx plugin** — Fix later, separately. It can eventually become a thin wrapper around the `forgekit` core.
5. **EXPANSION mode** — Build the cathedral. The feature set is proven; the opportunity is in reach.
