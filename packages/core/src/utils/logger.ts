/**
 * Simple logger utility for fire-signal.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LoggerFn = (message: string, level?: LogLevel) => void;

/**
 * Creates a console logger.
 *
 * @param minLevel - Minimum log level to output
 * @returns A logger function
 */
export function createConsoleLogger(minLevel: LogLevel = 'info'): LoggerFn {
  const levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  return (message: string, level: LogLevel = 'info') => {
    if (levels[level] >= levels[minLevel]) {
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
