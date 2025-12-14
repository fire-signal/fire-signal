/**
 * Simple logger utility for fire-signal.
 */

/**
 * Available log levels.
 * - silent: No output
 * - error: Only errors
 * - warn: Errors and warnings
 * - info: Errors, warnings, and info
 * - debug: All output including debug
 */
export type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug';

export type LoggerFn = (message: string, level?: LogLevel) => void;

/**
 * Log level priority (higher = more severe/important).
 */
export const LOG_LEVELS: Record<LogLevel, number> = {
  silent: -1,
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Creates a console logger.
 *
 * @param minLevel - Minimum log level to output
 * @returns A logger function
 */
export function createConsoleLogger(minLevel: LogLevel = 'info'): LoggerFn {
  if (minLevel === 'silent') {
    return silentLogger;
  }

  return (message: string, level: LogLevel = 'info') => {
    if (level === 'silent') return;
    if (LOG_LEVELS[level] >= LOG_LEVELS[minLevel]) {
      const prefix = `[fire-signal] [${level.toUpperCase()}]`;
      switch (level) {
        case 'debug':
          console.debug(`${prefix} ${message}`);
          break;
        case 'info':
          console.info(`${prefix} ${message}`);
          break;
        case 'warn':
          console.warn(`${prefix} ${message}`);
          break;
        case 'error':
          console.error(`${prefix} ${message}`);
          break;
      }
    }
  };
}

/**
 * A no-op logger that does nothing.
 */
export const silentLogger: LoggerFn = () => {};
