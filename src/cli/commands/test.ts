import type { CommandModule } from 'yargs';
import * as path from 'node:path';

import { ui } from '../ui';
import { forgeTest } from '../../api/forge-test';

interface TestArgs {
  path: string;
  overwrite: boolean;
  'dry-run': boolean;
}

export const testCommand: CommandModule<object, TestArgs> = {
  command: 'test <path>',
  describe: 'Generate a Playwright component test for a React component',
  builder: (yargs) =>
    yargs
      .positional('path', {
        describe: 'Path to the component file',
        type: 'string',
        demandOption: true,
      })
      .option('overwrite', {
        describe: 'Overwrite existing test file',
        type: 'boolean',
        default: false,
      })
      .option('dry-run', {
        describe: 'Preview without writing files',
        type: 'boolean',
        default: false,
      }),
  handler: async (argv) => {
    ui.banner();

    try {
      ui.step(1, 3, 'Analyzing component');

      const result = await forgeTest({
        componentPath: argv.path,
        overwrite: argv.overwrite,
        dryRun: argv['dry-run'],
      });

      if (argv['dry-run']) {
        ui.info('Dry run — no files will be written.');
        ui.separator();
        console.log(result.content);
        ui.separator();
        return;
      }

      ui.step(2, 3, 'Generating Playwright component test');
      ui.step(3, 3, 'Writing file');

      const relPath = path.relative(process.cwd(), result.testPath);
      ui.fileCreated(relPath);

      ui.analysisReport({
        name: result.analysis.name,
        propsCount: result.analysis.props.length,
        hasChildren: result.analysis.hasChildren,
        usesRouter: result.analysis.usesRouter,
        usesChakra: result.analysis.usesChakra,
        usesReactQuery: result.analysis.usesReactQuery,
        exportType: result.analysis.exportType,
        storiesGenerated: [
          'mounts and renders',
          'matches screenshot',
          ...(result.analysis.props.some((p) => p.isCallback)
            ? ['handles interactions']
            : []),
          ...(result.analysis.props.some(
            (p) => p.name === 'disabled' || p.name === 'isDisabled'
          )
            ? ['disabled state']
            : []),
          'meets a11y standards',
        ],
      });

      ui.done(`Playwright test generated at ${relPath}`);
    } catch (err) {
      ui.error((err as Error).message);
      process.exit(1);
    }
  },
};
