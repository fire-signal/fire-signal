/**
 * Environment variable utilities for fire-signal.
 */

/**
 * Environment variable names used by fire-signal.
 */
export const ENV_VARS = {
  URLS: 'FIRE_SIGNAL_URLS',
  CONFIG_PATH: 'FIRE_SIGNAL_CONFIG_PATH',
} as const;

/**
 * Loads notification URLs from the FIRE_SIGNAL_URLS environment variable.
 * URLs can be separated by commas, spaces, or newlines.
 *
 * @returns Array of URL strings
 */
export function loadUrlsFromEnv(): string[] {
  const raw = process.env[ENV_VARS.URLS];
  if (!raw) {
    return [];
  }
  return raw
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Loads configuration file paths from the FIRE_SIGNAL_CONFIG_PATH environment variable.
 * Paths can be separated by colons, semicolons, or newlines.
 *
 * @returns Array of file paths
 */
export function loadConfigPathsFromEnv(): string[] {
  const raw = process.env[ENV_VARS.CONFIG_PATH];
  if (!raw) {
    return [];
  }
  return raw
    .split(/[:;\n\r]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}
