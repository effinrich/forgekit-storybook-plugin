import type { CommandModule } from 'yargs';
import * as path from 'node:path';

import { ui } from '../ui';
import { forgeStory } from '../../api/forge-story';

interface StoryArgs {
  path: string;
  'story-title'?: string;
  'skip-interaction-tests': boolean;
  overwrite: boolean;
  'dry-run': boolean;
}

export const storyCommand: CommandModule<object, StoryArgs> = {
  command: 'story <path>',
  describe: 'Generate a Storybook story for a React component',
  builder: (yargs) =>
    yargs
      .positional('path', {
        describe: 'Path to the component file',
        type: 'string',
        demandOption: true,
      })
      .option('story-title', {
        describe: 'Custom Storybook title',
        type: 'string',
      })
      .option('skip-interaction-tests', {
        describe: 'Skip generating play functions',
        type: 'boolean',
        default: false,
      })
      .option('overwrite', {
        describe: 'Overwrite existing story file',
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

      const result = await forgeStory({
        componentPath: argv.path,
        storyTitle: argv['story-title'],
        skipInteractionTests: argv['skip-interaction-tests'],
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

      ui.step(2, 3, 'Generating story');
      ui.step(3, 3, 'Writing file');

      const relPath = path.relative(process.cwd(), result.storyPath);
      ui.fileCreated(relPath);

      ui.analysisReport({
        name: result.analysis.name,
        propsCount: result.analysis.props.length,
        hasChildren: result.analysis.hasChildren,
        usesRouter: result.analysis.usesRouter,
        usesChakra: result.analysis.usesChakra,
        usesReactQuery: result.analysis.usesReactQuery,
        exportType: result.analysis.exportType,
        storiesGenerated: result.storiesGenerated,
      });

      ui.done(`Story generated at ${relPath}`);
    } catch (err) {
      ui.error((err as Error).message);
      process.exit(1);
    }
  },
};
