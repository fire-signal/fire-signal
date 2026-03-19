#!/usr/bin/env node
/**
 * Fire-Signal CLI - Unified notification command-line interface.
 *
 * Usage:
 *   fire-signal -t "Title" -b "Body" <urls...>
 *   fire-signal -u ntfy://topic -u fire://key@api.fire-signal.com -t "Title" -b "Body"
 *   fire-signal -g tag1,tag2 -c /path/config.yml
 *   echo "Body" | fire-signal -t "Title"
 *   fire-signal --dry-run -t "Test" -b "Message" ntfy://...
 */

import { Command } from 'commander';
import { FireSignal } from '../core/FireSignal';
import { FSMessage } from '../core/Message';
import { loadFSConfig } from '../config/ConfigLoader';
import { loadUrlsFromEnv, loadConfigPathsFromEnv } from '../config/env';
import { createConsoleLogger, LogLevel, silentLogger } from '../utils/logger';
import { readStdinIfEmpty } from '../utils/stdin';
import { validateFSUrl } from '../core/UrlValidator';
import { FSProviderResult } from '../providers/base/Provider';

const program = new Command();

program
  .name('fire-signal')
  .description('Unified notification CLI for Node/TypeScript')
  .version('0.2.0')
  .option('-t, --title <title>', 'Notification title/subject')
  .option('-b, --body <body>', 'Notification body; if absent, reads from stdin')
  .option(
    '-g, --tag <tags...>',
    'Tags to filter URLs (comma or space separated)'
  )
  .option('--tags <tags>', 'Alias for -g/--tag')
  .option(
    '-a, --audience <labels>',
    'Audience labels for fire:// provider (comma or space separated)',
    (value: string, previous: string[] = []) =>
      previous.concat(value.split(/[\s,]+/).filter(Boolean)),
    []
  )
  .option(
    '-u, --url <url>',
    'Provider URL (repeatable). Example: -u fire://... -u ntfy://...',
    (value: string, previous: string[] = []) => previous.concat(value),
    []
  )
  .option('--segment-id <id>', 'Fire Platform segment ID for fire:// provider')
  .option(
    '--template-key <key>',
    'Fire Platform template key for fire:// provider'
  )
  .option('-c, --config <paths...>', 'Additional config file paths')
  .option(
    '-l, --log-level <level>',
    'Log level: silent, error, warn, info, debug',
    'info'
  )
  .option('-v, --verbose', 'Enable verbose logging (same as --log-level debug)')
  .option('-q, --quiet', 'Suppress output (same as --log-level silent)')
  .option('--dry-run', 'Show what would be sent without actually sending')
  .option('--json', 'Output results as JSON (machine-parseable)')
  .option('--timeout <ms>', 'Request timeout in milliseconds', '30000')
  .option('--retries <count>', 'Number of retry attempts on failure', '0')
  .option('--validate', 'Validate URLs without sending')
  .argument('[urls...]', 'Notification URLs to send to')
  .action(async (urls: string[], options: CLIOptions) => {
    try {
      await runCLI(urls, options);
    } catch (error) {
      if (options.json) {
        console.log(
          JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
          })
        );
      } else {
        console.error(
          'Error:',
          error instanceof Error ? error.message : String(error)
        );
      }
      process.exit(1);
    }
  });

interface CLIOptions {
  title?: string;
  body?: string;
  url?: string[];
  tag?: string[];
  tags?: string;
  audience?: string[];
  segmentId?: string;
  templateKey?: string;
  config?: string[];
  logLevel?: string;
  verbose?: boolean;
  quiet?: boolean;
  dryRun?: boolean;
  json?: boolean;
  timeout?: string;
  retries?: string;
  validate?: boolean;
}

interface DryRunPayload {
  provider: string;
  url: string;
  title?: string;
  body: string;
  wouldSendTo?: string;
}

interface JSONOutput {
  results: Array<{
    providerId: string;
    url: string;
    success: boolean;
    attempts?: number;
    durationMs?: number;
    error?: string;
  }>;
  summary: {
    total: number;
    success: number;
    failed: number;
  };
  dryRun?: boolean;
  validation?: {
    valid: boolean;
    errors: Array<{
      url: string;
      code: string;
      message: string;
      suggestion?: string;
    }>;
  };
}

async function runCLI(urls: string[], options: CLIOptions): Promise<void> {
  // Determine log level: quiet > verbose > logLevel
  let logLevel: LogLevel = 'info';
  if (options.quiet || options.json) {
    logLevel = 'silent';
  } else if (options.verbose) {
    logLevel = 'debug';
  } else if (options.logLevel) {
    logLevel = options.logLevel as LogLevel;
  }

  // Create logger based on options
  const logger =
    logLevel === 'silent' ? silentLogger : createConsoleLogger(logLevel);

  // Load config from files
  const envConfigPaths = loadConfigPathsFromEnv();
  const allConfigPaths = [...(options.config ?? []), ...envConfigPaths];
  const config = await loadFSConfig(allConfigPaths);

  // Load URLs from environment
  const envUrls = loadUrlsFromEnv();

  // Combine all URLs: CLI args > ENV > config
  const allUrls = [
    ...(options.url ?? []),
    ...urls,
    ...envUrls,
    ...config.entries.map((e) => e.url),
  ];

  // Parse tags (combine -g/--tag and --tags)
  const tagList = [
    ...(options.tag?.flatMap((t) => t.split(/[,\s]+/).filter(Boolean)) ?? []),
    ...(options.tags?.split(/[,\s]+/).filter(Boolean) ?? []),
  ];

  const audienceList = options.audience ?? [];

  // Handle --validate option
  if (options.validate) {
    return handleValidation(allUrls, options);
  }

  // Read body from stdin if not provided
  const body = await readStdinIfEmpty(options.body);

  if (!body && !options.dryRun) {
    if (options.json) {
      console.log(JSON.stringify({ error: 'No message body provided' }));
    } else {
      console.error(
        'Error: No message body provided. Use -b or pipe to stdin.'
      );
    }
    process.exit(1);
  }

  if (allUrls.length === 0) {
    if (options.json) {
      console.log(JSON.stringify({ error: 'No notification URLs provided' }));
    } else {
      console.error('Error: No notification URLs provided.');
      console.error(
        'Provide URLs as arguments, via FIRE_SIGNAL_URLS env, or in config files.'
      );
    }
    process.exit(1);
  }

  // Build message
  const message: FSMessage = {
    title: options.title,
    body: body || '(dry-run: no body)',
  };

  // Handle --dry-run option
  if (options.dryRun) {
    return handleDryRun(allUrls, message, tagList, options);
  }

  // Create FireSignal instance
  const fsignal = new FireSignal({
    urls: allUrls,
    logger,
  });

  // Parse timeout and retries
  const timeout = parseInt(options.timeout ?? '30000', 10);
  const retries = parseInt(options.retries ?? '0', 10);

  // Log config if verbose
  if (options.verbose) {
    logger(`Timeout: ${timeout}ms, Retries: ${retries}`, 'debug');
  }

  // Send notifications
  const startTime = Date.now();
  const results = await fsignal.send(message, {
    tags: tagList.length > 0 ? tagList : undefined,
    audience: audienceList.length > 0 ? audienceList : undefined,
    segmentId: options.segmentId,
    templateKey: options.templateKey,
  });
  const totalDuration = Date.now() - startTime;

  // Output results
  if (options.json) {
    outputJSON(results, totalDuration);
  } else {
    outputText(results, options.quiet);
  }
}

function handleValidation(urls: string[], options: CLIOptions): void {
  const validationErrors: Array<{
    url: string;
    code: string;
    message: string;
    suggestion?: string;
  }> = [];

  let allValid = true;

  for (const url of urls) {
    const result = validateFSUrl(url);
    if (!result.valid) {
      allValid = false;
      for (const err of result.errors) {
        validationErrors.push({
          url,
          code: err.code,
          message: err.message,
          suggestion: err.suggestion,
        });
      }
    }
  }

  if (options.json) {
    const output: JSONOutput = {
      results: [],
      summary: { total: urls.length, success: 0, failed: 0 },
      validation: {
        valid: allValid,
        errors: validationErrors,
      },
    };
    console.log(JSON.stringify(output, null, 2));
  } else {
    if (allValid) {
      console.log(`✓ All ${urls.length} URL(s) are valid`);
    } else {
      console.error(`✗ Validation failed:`);
      for (const err of validationErrors) {
        console.error(`  [${err.code}] ${err.message}`);
        if (err.suggestion) {
          console.error(`    → ${err.suggestion}`);
        }
        console.error(`    URL: ${err.url}`);
      }
    }
  }

  process.exit(allValid ? 0 : 1);
}

function handleDryRun(
  urls: string[],
  message: FSMessage,
  tags: string[],
  options: CLIOptions
): void {
  const payloads: DryRunPayload[] = [];

  for (const url of urls) {
    const result = validateFSUrl(url);
    if (!result.valid || !result.parsed) continue;

    const schema = result.parsed.schema;
    const payload: DryRunPayload = {
      provider: schema,
      url: url,
      title: message.title,
      body: message.body,
    };

    // Add provider-specific endpoint info
    switch (schema) {
      case 'discord':
        payload.wouldSendTo = `https://discord.com/api/webhooks/${result.parsed.hostname}/${result.parsed.segments[0]}`;
        break;
      case 'tgram':
      case 'telegram':
        payload.wouldSendTo = `https://api.telegram.org/bot${result.parsed.hostname}/sendMessage`;
        break;
      case 'slack':
        payload.wouldSendTo = `https://hooks.slack.com/services/${result.parsed.hostname}/${result.parsed.segments.join('/')}`;
        break;
      case 'ntfy':
      case 'ntfys':
        payload.wouldSendTo = `https://${result.parsed.hostname}/${result.parsed.segments[0] || result.parsed.path}`;
        break;
      case 'rocketchat':
      case 'rocket':
        payload.wouldSendTo = `https://${result.parsed.hostname}/hooks/${result.parsed.segments[0]}`;
        break;
      case 'mailto':
      case 'mailtos':
        payload.wouldSendTo = `SMTP: ${result.parsed.hostname} → ${result.parsed.params.to}`;
        break;
      default:
        payload.wouldSendTo = `${schema}://${result.parsed.hostname}${result.parsed.path ? '/' + result.parsed.path : ''}`;
    }

    payloads.push(payload);
  }

  if (options.json) {
    const output: JSONOutput = {
      results: payloads.map((p) => ({
        providerId: p.provider,
        url: p.url,
        success: true, // dry-run always "succeeds"
      })),
      summary: {
        total: payloads.length,
        success: payloads.length,
        failed: 0,
      },
      dryRun: true,
    };
    console.log(JSON.stringify(output, null, 2));
  } else {
    console.log('🔥 DRY-RUN MODE - No notifications will be sent\n');
    console.log(`Message:`);
    if (message.title) {
      console.log(`  Title: ${message.title}`);
    }
    console.log(`  Body: ${message.body}`);
    if (tags.length > 0) {
      console.log(`  Tags: ${tags.join(', ')}`);
    }
    console.log();

    for (const payload of payloads) {
      console.log(`---`);
      console.log(`Provider: ${payload.provider}`);
      console.log(`URL: ${payload.url}`);
      if (payload.wouldSendTo) {
        console.log(`Would send to: ${payload.wouldSendTo}`);
      }
    }
    console.log(`---`);
    console.log(`\nTotal: ${payloads.length} provider(s) would be notified`);
  }

  process.exit(0);
}

function outputJSON(
  results: FSProviderResult[],
  totalDurationMs: number
): void {
  const successCount = results.filter((r) => r.success).length;
  const output: JSONOutput & { totalDurationMs: number } = {
    results: results.map((r) => ({
      providerId: r.providerId,
      url: '', // URL is not available in FSProviderResult
      success: r.success,
      attempts: r.attempts,
      durationMs: r.durationMs,
      error: r.error?.message,
    })),
    summary: {
      total: results.length,
      success: successCount,
      failed: results.length - successCount,
    },
    totalDurationMs,
  };
  console.log(JSON.stringify(output, null, 2));
}

function outputText(results: FSProviderResult[], quiet?: boolean): void {
  let hasError = false;

  for (const result of results) {
    if (!result.success) {
      hasError = true;
      if (!quiet) {
        console.error(`[${result.providerId}] FAIL: ${result.error?.message}`);
      }
    } else if (!quiet) {
      const extra =
        result.attempts && result.attempts > 1
          ? ` (${result.attempts} attempts)`
          : '';
      console.log(`[${result.providerId}] OK${extra}`);
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
