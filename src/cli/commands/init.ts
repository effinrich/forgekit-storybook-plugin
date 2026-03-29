import type { CommandModule } from 'yargs'
import * as fs from 'node:fs'
import * as path from 'node:path'

import { ui } from '../ui'

export const initCommand: CommandModule = {
  command: 'init',
  describe: 'Check prerequisites and show setup guide',
  handler: async () => {
    ui.banner()
    ui.step(1, 2, 'Checking prerequisites')

    const cwd = process.cwd()
    const pkgPath = path.join(cwd, 'package.json')

    if (!fs.existsSync(pkgPath)) {
      ui.error('No package.json found in current directory.')
      ui.hint('Run this command from your project root.')
      process.exit(1)
    }

    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies
    }

    const checks = [
      { name: 'react', label: 'React' },
      { name: 'storybook', label: 'Storybook' },
      { name: '@storybook/react-vite', label: '@storybook/react-vite' },
      { name: 'typescript', label: 'TypeScript' }
    ]

    let allGood = true
    for (const check of checks) {
      if (allDeps[check.name]) {
        ui.success(`${check.label} — ${allDeps[check.name]}`)
      } else {
        ui.warn(`${check.label} — not found`)
        allGood = false
      }
    }

    // Optional deps
    const optionalChecks = [
      { name: '@storybook/test', label: '@storybook/test (interaction tests)' },
      {
        name: '@storybook/addon-a11y',
        label: '@storybook/addon-a11y (accessibility)'
      },
      {
        name: '@playwright/experimental-ct-react',
        label: 'Playwright CT (component tests)'
      },
      {
        name: '@axe-core/playwright',
        label: 'axe-core Playwright (a11y in CT)'
      }
    ]

    console.log('')
    ui.info('Optional dependencies:')
    for (const check of optionalChecks) {
      if (allDeps[check.name]) {
        ui.success(`${check.label}`)
      } else {
        ui.skip(`${check.label} — not installed`)
      }
    }

    // Show available commands
    ui.step(2, 2, 'Available commands')
    console.log('')
    console.log(
      `  ${ui.command('forgekit-storybook-plugin story <path>')}       Generate a story for one component`
    )
    console.log(
      `  ${ui.command('forgekit-storybook-plugin stories <dir>')}      Bulk generate stories for a directory`
    )
    console.log(
      `  ${ui.command('forgekit-storybook-plugin test <path>')}        Generate a Playwright component test`
    )
    console.log(
      `  ${ui.command('forgekit-storybook-plugin watch <dir>')}        Watch and auto-generate on changes`
    )
    console.log(
      `  ${ui.command('forgekit-storybook-plugin coverage <dir>')}     Report story coverage`
    )
    console.log('')

    if (!allGood) {
      ui.hint('Install missing dependencies before generating stories.')
    }

    ui.done('ForgeKit Storybook Plugin is ready!')
  }
}
