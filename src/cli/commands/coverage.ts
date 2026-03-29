import type { CommandModule } from 'yargs';

import { ui } from '../ui';
import { scanDirectory } from '../../core/scan-directory';
import { scoreCoverage } from '../../core/score-coverage';

interface CoverageArgs {
  dir: string;
  json: boolean;
}

export const coverageCommand: CommandModule<object, CoverageArgs> = {
  command: 'coverage <dir>',
  describe: 'Report story coverage without generating any files',
  builder: (yargs) =>
    yargs
      .positional('dir', {
        describe: 'Directory to scan for components',
        type: 'string',
        demandOption: true,
      })
      .option('json', {
        describe: 'Output results as JSON',
        type: 'boolean',
        default: false,
      }),
  handler: async (argv) => {
    try {
      const scan = await scanDirectory(argv.dir);
      const totalAnalyzable = scan.total - scan.notAnalyzable.length;
      const coverage = scoreCoverage(scan.withStories.length, totalAnalyzable);

      if (argv.json) {
        console.log(
          JSON.stringify(
            {
              covered: coverage.covered,
              total: coverage.total,
              percentage: coverage.percentage,
              grade: coverage.grade,
              withStories: scan.withStories.length,
              withoutStories: scan.withoutStories.length,
              notAnalyzable: scan.notAnalyzable.length,
            },
            null,
            2
          )
        );
        return;
      }

      ui.banner();

      ui.info(`Scanned ${scan.total} component files`);
      ui.success(`${scan.withStories.length} have stories`);
      if (scan.withoutStories.length > 0) {
        ui.warn(`${scan.withoutStories.length} missing stories`);
      }
      if (scan.notAnalyzable.length > 0) {
        ui.skip(`${scan.notAnalyzable.length} could not be analyzed`);
      }

      ui.separator();
      console.log('');

      const method = ['A', 'B'].includes(coverage.grade) ? 'success'
        : ['C', 'D'].includes(coverage.grade) ? 'warn'
        : 'error';
      ui[method](
        `Story Coverage: ${coverage.percentage}% (${coverage.covered}/${coverage.total}) — Grade: ${coverage.grade}`
      );

      ui.done();
    } catch (err) {
      ui.error((err as Error).message);
      process.exit(1);
    }
  },
};
