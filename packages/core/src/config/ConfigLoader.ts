/**
 * Configuration file loader for fire-signal.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import YAML from 'yaml';
import { FSConfigError } from '../core/errors';

/**
 * Represents a single URL entry from configuration.
 */
export interface FSConfigEntry {
  url: string;
  tags?: string[];
}

/**
 * Loaded configuration data.
 */
export interface FSLoadedConfig {
  entries: FSConfigEntry[];
}

/**
 * Default configuration file paths.
 */
export const DEFAULT_CONFIG_PATHS = [
  path.join(os.homedir(), '.fire-signal.yml'),
  path.join(os.homedir(), '.fire-signal.yaml'),
  path.join(os.homedir(), '.config', 'fire-signal', 'config.yml'),
  '/etc/fire-signal.yml',
];

/**
 * Parses a configuration file content.
 *
 * @param content - YAML content string
 * @param filePath - Path to the file (for error messages)
 * @returns Array of config entries
 */
function parseConfigContent(
  content: string,
  filePath: string
): FSConfigEntry[] {
  const entries: FSConfigEntry[] = [];

  try {
    const data = YAML.parse(content) as unknown;

    if (!data || typeof data !== 'object') {
      return entries;
    }

    const config = data as Record<string, unknown>;

    // Handle 'urls' array format
    if (Array.isArray(config.urls)) {
      for (const item of config.urls) {
        if (typeof item === 'string') {
          entries.push({ url: item, tags: [] });
        } else if (typeof item === 'object' && item !== null) {
          const urlItem = item as Record<string, unknown>;
          if (typeof urlItem.url === 'string') {
            const tags = Array.isArray(urlItem.tags)
              ? urlItem.tags.filter((t): t is string => typeof t === 'string')
              : [];
            entries.push({ url: urlItem.url, tags });
          }
        }
      }
    }

    // Handle simple key-value format (key = tag, value = url)
    if (typeof config.services === 'object' && config.services !== null) {
      const services = config.services as Record<string, unknown>;
      for (const [tag, url] of Object.entries(services)) {
        if (typeof url === 'string') {
          entries.push({ url, tags: [tag] });
        }
      }
    }
  } catch (error) {
    throw new FSConfigError(
      `Failed to parse config file: ${error instanceof Error ? error.message : String(error)}`,
      filePath
    );
  }

  return entries;
}

/**
 * Loads configuration from the default and specified paths.
 *
 * @param paths - Additional paths to check
 * @returns Loaded configuration
 */
export async function loadFSConfig(
  paths: string[] = []
): Promise<FSLoadedConfig> {
  const entries: FSConfigEntry[] = [];
  const allPaths = [...paths, ...DEFAULT_CONFIG_PATHS];

  for (const configPath of allPaths) {
    try {
      const content = await fs.readFile(configPath, 'utf8');
      const parsed = parseConfigContent(content, configPath);
      entries.push(...parsed);
    } catch (error) {
      // Ignore file not found errors
      if (
        error instanceof Error &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        continue;
      }
      // Re-throw parse errors
      if (error instanceof FSConfigError) {
        throw error;
      }
      // Ignore other read errors (permission, etc.)
    }
  }

  return { entries };
}

/**
 * Writes a configuration file.
 *
 * @param filePath - Path to write to
 * @param entries - Entries to write
 */
export async function writeFSConfig(
  filePath: string,
  entries: FSConfigEntry[]
): Promise<void> {
  const config = {
    urls: entries.map((e) => ({
      url: e.url,
      tags: e.tags && e.tags.length > 0 ? e.tags : undefined,
    })),
  };

  const content = YAML.stringify(config);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf8');
}
