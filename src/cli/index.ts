import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

import { storyCommand } from './commands/story'
import { storiesCommand } from './commands/stories'
import { testCommand } from './commands/test'
import { watchCommand } from './commands/watch'
import { coverageCommand } from './commands/coverage'
import { initCommand } from './commands/init'

yargs(hideBin(process.argv))
  .scriptName('forgekit-storybook-plugin')
  .usage('$0 <command> [options]')
  .command(storyCommand)
  .command(storiesCommand)
  .command(testCommand)
  .command(watchCommand)
  .command(coverageCommand)
  .command(initCommand)
  .demandCommand(1, 'Please specify a command.')
  .strict()
  .alias('h', 'help')
  .alias('v', 'version')
  .parse()
