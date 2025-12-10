/**
 * Tag filtering utilities for fire-signal.
 */

/**
 * Represents a URL entry with optional tags.
 */
export interface TaggedUrl {
  url: string;
  tags: string[];
}

/**
 * Filters URLs by tags.
 * If no filter tags are provided, all URLs are returned.
 * If filter tags are provided, only URLs with at least one matching tag are returned.
 *
 * @param entries - Array of tagged URL entries
 * @param filterTags - Tags to filter by (optional)
 * @returns Filtered array of URL strings
 */
export function filterByTags(entries: TaggedUrl[], filterTags?: string[]): string[] {
  if (!filterTags || filterTags.length === 0) {
    return entries.map((e) => e.url);
  }

  const filterSet = new Set(filterTags.map((t) => t.toLowerCase()));

  return entries
    .filter((entry) => {
      if (!entry.tags || entry.tags.length === 0) {
        return false;
      }
      return entry.tags.some((tag) => filterSet.has(tag.toLowerCase()));
    })
    .map((e) => e.url);
}

/**
 * Parses a comma-separated tag string into an array.
 *
 * @param tagString - Comma or space separated tags
 * @returns Array of tags
 */
export function parseTags(tagString: string): string[] {
  return tagString
    .split(/[,\s]+/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}
