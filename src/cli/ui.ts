import chalk from 'chalk'

const BRAND = chalk.hex('#6C5CE7')
const BRAND_BG = chalk.bgHex('#6C5CE7').white.bold

export const ui = {
  banner(): void {
    console.log('')
    console.log(BRAND_BG('                                      '))
    console.log(BRAND_BG('   ⚡ ForgeKit Storybook Plugin        '))
    console.log(BRAND_BG('                                      '))
    console.log('')
  },

  success(msg: string): void {
    console.log(chalk.green('  ✔ ') + msg)
  },

  warn(msg: string): void {
    console.log(chalk.yellow('  ⚠ ') + msg)
  },

  error(msg: string): void {
    console.log(chalk.red('  ✖ ') + msg)
  },

  info(msg: string): void {
    console.log(chalk.cyan('  ℹ ') + msg)
  },

  skip(msg: string): void {
    console.log(chalk.dim('  ‣ ') + chalk.dim(msg))
  },

  step(number: number, total: number, label: string): void {
    console.log('')
    console.log(
      chalk.bold(BRAND(`  [${number}/${total}]`)) + chalk.bold(` ${label}`)
    )
  },

  fileCreated(filePath: string): void {
    console.log(chalk.green('  CREATE ') + chalk.white(filePath))
  },

  fileUpdated(filePath: string): void {
    console.log(chalk.yellow('  UPDATE ') + chalk.white(filePath))
  },

  fileSkipped(filePath: string): void {
    console.log(chalk.dim('  SKIP   ') + chalk.dim(filePath))
  },

  analysisReport(report: {
    name: string
    propsCount: number
    hasChildren: boolean
    usesRouter: boolean
    usesChakra: boolean
    usesReactQuery: boolean
    exportType: string
    storiesGenerated: string[]
  }): void {
    console.log('')
    console.log(chalk.bold('  Component: ') + BRAND(report.name))
    console.log(chalk.dim('  ─────────────────────────────────────'))
    console.log(
      chalk.bold('  Props:       ') +
        (report.propsCount > 0
          ? chalk.white(`${report.propsCount} detected`)
          : chalk.dim('none'))
    )

    const features: string[] = []
    if (report.hasChildren) features.push('children')
    if (report.usesRouter) features.push(chalk.blue('router'))
    if (report.usesChakra) features.push(chalk.magenta('chakra'))
    if (report.usesReactQuery) features.push(chalk.cyan('react-query'))

    if (features.length > 0) {
      console.log(
        chalk.bold('  Features:    ') + features.join(chalk.dim(' · '))
      )
    }

    console.log(chalk.bold('  Export:      ') + chalk.white(report.exportType))

    if (report.storiesGenerated.length > 0) {
      console.log(
        chalk.bold('  Stories:     ') +
          chalk.green(report.storiesGenerated.join(chalk.dim(', ')))
      )
    }
    console.log('')
  },

  done(msg?: string): void {
    console.log('')
    console.log(chalk.green.bold('  Done! ') + (msg ? chalk.white(msg) : ''))
    console.log('')
  },

  separator(): void {
    console.log(chalk.dim('  ─────────────────────────────────────'))
  },

  hint(msg: string): void {
    console.log(chalk.dim(`  💡 ${msg}`))
  },

  command(cmd: string): string {
    return chalk.cyan.bold(cmd)
  }
}
