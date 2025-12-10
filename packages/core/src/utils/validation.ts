/**
 * Validation utilities for fire-signal.
 */

import { FSMessage } from '../core/Message';
import { isValidFSUrl } from '../core/UrlParser';

/**
 * Validates that a message has the required fields.
 *
 * @param message - Message to validate
 * @returns true if valid
 * @throws Error if invalid
 */
export function validateMessage(message: FSMessage): boolean {
  if (!message) {
    throw new Error('Message is required');
  }

  if (typeof message.body !== 'string') {
    throw new Error('Message body must be a string');
  }

  if (message.body.trim() === '') {
    throw new Error('Message body cannot be empty');
  }

  if (message.title !== undefined && typeof message.title !== 'string') {
    throw new Error('Message title must be a string');
  }

  if (message.tags !== undefined && !Array.isArray(message.tags)) {
    throw new Error('Message tags must be an array');
  }

  return true;
}

/**
 * Validates an array of URLs.
 *
 * @param urls - URLs to validate
 * @returns Array of valid URLs
 */
export function validateUrls(urls: string[]): string[] {
  return urls.filter((url) => {
    if (typeof url !== 'string' || url.trim() === '') {
      return false;
    }
    return isValidFSUrl(url);
  });
}

/**
 * Checks if a value is a non-empty string.
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}
