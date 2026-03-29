import type { CommandModule } from 'yargs';
import * as path from 'node:path';

import { ui } from '../ui';
import { watchDirectory } from '../../core/watch';

interface WatchArgs {
  dir: string;
  'skip-interaction-tests': boolean;
  debounce: number;
}

export const watchCommand: CommandModule<object, WatchArgs> = {
  command: 'watch <dir>',
  describe: 'Watch for component changes and auto-generate stories',
  builder: (yargs) =>
    yargs
      .positional('dir', {
        describe: 'Directory to watch',
        type: 'string',
        demandOption: true,
      })
      .option('skip-interaction-tests', {
        describe: 'Skip generating play functions',
        type: 'boolean',
        default: false,
      })
      .option('debounce', {
        describe: 'Debounce interval in milliseconds',
        type: 'number',
        default: 300,
      }),
  handler: async (argv) => {
    ui.banner();

    ui.info('Watching for component changes in:');
    console.log(`      ${ui.command(path.resolve(argv.dir))}`);
    console.log('');
    ui.hint('Press Ctrl+C to stop.');
    console.log('');

    try {
      const handle = watchDirectory(
        {
          dir: argv.dir,
          debounceMs: argv.debounce,
          skipInteractionTests: argv['skip-interaction-tests'],
        },
        (event) => {
          switch (event.type) {
            case 'ready':
              ui.success('Watching for changes...');
              break;
            case 'generate':
              ui.separator();
              ui.fileCreated(path.relative(process.cwd(), event.storyPath));
              break;
            case 'update':
              ui.separator();
              ui.fileUpdated(path.relative(process.cwd(), event.storyPath));
              break;
            case 'error':
              ui.separator();
              ui.error(
                `Failed: ${path.relative(process.cwd(), event.file)} — ${event.error.message}`
              );
              break;
          }
        },
      );

      // Keep alive until SIGINT/SIGTERM
      await new Promise<void>((resolve) => {
        const cleanup = async () => {
          await handle.close();
          console.log('');
          ui.info('Stopped watching for changes.');
          resolve();
        };

        process.on('SIGINT', cleanup);
        process.on('SIGTERM', cleanup);
      });
    } catch (err) {
      ui.error((err as Error).message);
      process.exit(1);
    }
  },
};
