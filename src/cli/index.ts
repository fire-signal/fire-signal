#!/usr/bin/env node
/**
 * Fire-Signal CLI - Unified notification command-line interface.
 *
 * Usage:
 *   fire-signal -t "Title" -b "Body" <urls...>
 *   fire-signal -g tag1,tag2 -c /path/config.yml
 *   echo "Body" | fire-signal -t "Title"
 */

import { Command } from 'commander';
import { FireSignal } from '../core/FireSignal';
import { FSMessage } from '../core/Message';
import { loadFSConfig } from '../config/ConfigLoader';
import { loadUrlsFromEnv, loadConfigPathsFromEnv } from '../config/env';
import { createConsoleLogger } from '../utils/logger';
import { readStdinIfEmpty } from '../utils/stdin';

const program = new Command();

program
  .name('fire-signal')
  .description('Unified notification CLI for Node/TypeScript')
  .version('0.1.0')
  .option('-t, --title <title>', 'Notification title/subject')
  .option('-b, --body <body>', 'Notification body; if absent, reads from stdin')
  .option(
    '-g, --tag <tags...>',
    'Tags to filter URLs (comma or space separated)'
  )
  .option('-c, --config <paths...>', 'Additional config file paths')
  .option('-v, --verbose', 'Enable verbose logging')
  .option('-q, --quiet', 'Suppress output except errors')
  .argument('[urls...]', 'Notification URLs to send to')
  .action(async (urls: string[], options: CLIOptions) => {
    try {
      await runSend(urls, options);
    } catch (error) {
      console.error(
        'Error:',
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  });

interface CLIOptions {
  title?: string;
  body?: string;
  tag?: string[];
  config?: string[];
  verbose?: boolean;
  quiet?: boolean;
}

async function runSend(urls: string[], options: CLIOptions): Promise<void> {
  // Create logger based on options
  const logger = options.quiet
    ? () => {}
    : createConsoleLogger(options.verbose ? 'debug' : 'info');

  // Read body from stdin if not provided
  const body = await readStdinIfEmpty(options.body);

  if (!body) {
    console.error('Error: No message body provided. Use -b or pipe to stdin.');
    process.exit(1);
  }

  // Build message
  const message: FSMessage = {
    title: options.title,
    body,
  };

  // Load config from files
  const envConfigPaths = loadConfigPathsFromEnv();
  const allConfigPaths = [...(options.config ?? []), ...envConfigPaths];
  const config = await loadFSConfig(allConfigPaths);

  // Load URLs from environment
  const envUrls = loadUrlsFromEnv();

  // Combine all URLs: CLI args > ENV > config
  const allUrls = [...urls, ...envUrls, ...config.entries.map((e) => e.url)];

  if (allUrls.length === 0) {
    console.error('Error: No notification URLs provided.');
    console.error(
      'Provide URLs as arguments, via FIRE_SIGNAL_URLS env, or in config files.'
    );
    process.exit(1);
  }

  // Create FireSignal instance
  const fsignal = new FireSignal({
    urls: allUrls,
    logger,
  });

  // Parse tags
  const tags = options.tag?.flatMap((t) => t.split(/[,\s]+/).filter(Boolean));

  // Send notifications
  const results = await fsignal.send(message, { tags });

  // Output results
  let hasError = false;
  for (const result of results) {
    if (!result.success) {
      hasError = true;
      if (!options.quiet) {
        console.error(`[${result.providerId}] FAIL: ${result.error?.message}`);
      }
    } else if (!options.quiet) {
      console.log(`[${result.providerId}] OK`);
    }
  }

  process.exit(hasError ? 1 : 0);
}

// Parse and execute
program.parseAsync(process.argv).catch((error) => {
  console.error(
    'Error:',
    error instanceof Error ? error.message : String(error)
  );
  process.exit(1);
});
