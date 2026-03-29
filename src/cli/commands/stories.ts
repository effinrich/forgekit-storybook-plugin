import type { CommandModule } from 'yargs';
import * as path from 'node:path';

import { ui } from '../ui';
import { forgeStories } from '../../api/forge-stories';

interface StoriesArgs {
  dir: string;
  'skip-interaction-tests': boolean;
  overwrite: boolean;
  'dry-run': boolean;
  'include-tests': boolean;
}

export const storiesCommand: CommandModule<object, StoriesArgs> = {
  command: 'stories <dir>',
  describe: 'Bulk generate stories for all components in a directory',
  builder: (yargs) =>
    yargs
      .positional('dir', {
        describe: 'Directory to scan for components',
        type: 'string',
        demandOption: true,
      })
      .option('skip-interaction-tests', {
        describe: 'Skip generating play functions',
        type: 'boolean',
        default: false,
      })
      .option('overwrite', {
        describe: 'Overwrite existing story files',
        type: 'boolean',
        default: false,
      })
      .option('dry-run', {
        describe: 'Preview without writing files',
        type: 'boolean',
        default: false,
      })
      .option('include-tests', {
        describe: 'Also generate Playwright component tests',
        type: 'boolean',
        default: false,
      }),
  handler: async (argv) => {
    ui.banner();

    try {
      ui.step(1, 3, 'Scanning for components');

      const result = await forgeStories({
        dir: argv.dir,
        skipInteractionTests: argv['skip-interaction-tests'],
        overwrite: argv.overwrite,
        dryRun: argv['dry-run'],
        includeComponentTests: argv['include-tests'],
      });

      ui.step(2, 3, `Generating ${result.generated} stories`);

      ui.info(`Found ${result.total} analyzable components`);
      ui.success(`${result.alreadyCovered} already have stories`);

      if (result.generated > 0) {
        ui.success(`${result.generated} stories generated`);
      }
      if (result.failed > 0) {
        ui.warn(`${result.failed} failed`);
        for (const err of result.errors) {
          const rel = path.relative(process.cwd(), err.file);
          ui.error(`  ${rel}: ${err.error}`);
        }
      }
      if (result.notAnalyzable > 0) {
        ui.skip(`${result.notAnalyzable} could not be analyzed`);
      }

      // Coverage report
      ui.step(3, 3, 'Coverage report');
      ui.separator();
      console.log('');

      const { coverage } = result;
      const method = ['A', 'B'].includes(coverage.grade) ? 'success'
        : ['C', 'D'].includes(coverage.grade) ? 'warn'
        : 'error';
      ui[method](
        `Story Coverage: ${coverage.percentage}% (${coverage.covered}/${coverage.total}) — Grade: ${coverage.grade}`
      );

      console.log('');
      ui.info(`Generated: ${result.generated}`);
      if (result.failed > 0) ui.warn(`Failed: ${result.failed}`);
      ui.info(`Already covered: ${result.alreadyCovered}`);
      ui.info(`Total components: ${result.total}`);

      ui.done(
        argv['dry-run']
          ? 'Dry run complete — no files were written.'
          : `Generated ${result.generated} story files.`
      );
    } catch (err) {
      ui.error((err as Error).message);
      process.exit(1);
    }
  },
};
