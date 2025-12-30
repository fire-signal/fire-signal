import Handlebars from 'handlebars';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import type { FSMessage } from './Message';

/**
 * Template definition structure.
 */
export interface FSTemplate {
  /** Unique template name for reference. */
  name: string;
  /** Path to .hbs file OR inline template string. */
  source: string;
  /** Whether source is inline content (true) or file path (false). */
  inline?: boolean;
}

/**
 * Compiled template cache entry.
 */
interface CompiledTemplate {
  title?: Handlebars.TemplateDelegate;
  body: Handlebars.TemplateDelegate;
}

/**
 * TemplateManager handles registration, loading, and rendering of message templates.
 *
 * Templates use Handlebars syntax for variable substitution.
 *
 * @example
 * ```typescript
 * const manager = new TemplateManager();
 *
 * // Register from file
 * await manager.register('welcome', 'templates/welcome.hbs');
 *
 * // Register inline
 * manager.registerInline('alert', {
 *   title: 'Alert: {{severity}}',
 *   body: 'Service {{service}} is {{status}}.',
 * });
 *
 * // Render
 * const message = await manager.render('welcome', { name: 'John' });
 * ```
 */
export class TemplateManager {
  private templates: Map<string, CompiledTemplate> = new Map();

  /**
   * Register a template from a file path.
   *
   * File format (JSON or YAML-like):
   * ```
   * ---
   * title: Welcome, {{name}}!
   * ---
   * Hello {{name}},
   *
   * Thank you for joining us!
   * ```
   *
   * @param name - Unique template identifier.
   * @param filePath - Path to the template file (.hbs or .md).
   */
  async register(name: string, filePath: string): Promise<void> {
    if (!existsSync(filePath)) {
      throw new Error(`Template file not found: ${filePath}`);
    }

    const content = await readFile(filePath, 'utf-8');
    const { title, body } = this.parseTemplateFile(content);

    this.templates.set(name, {
      title: title ? Handlebars.compile(title) : undefined,
      body: Handlebars.compile(body),
    });
  }

  /**
   * Register a template inline (no file).
   *
   * @param name - Unique template identifier.
   * @param template - Object with title (optional) and body template strings.
   */
  registerInline(
    name: string,
    template: { title?: string; body: string }
  ): void {
    this.templates.set(name, {
      title: template.title ? Handlebars.compile(template.title) : undefined,
      body: Handlebars.compile(template.body),
    });
  }

  /**
   * Check if a template is registered.
   */
  has(name: string): boolean {
    return this.templates.has(name);
  }

  /**
   * Render a template with data.
   *
   * @param name - Template name to render.
   * @param data - Data object for variable substitution.
   * @returns FSMessage with rendered title and body.
   */
  render(name: string, data: Record<string, unknown> = {}): FSMessage {
    const template = this.templates.get(name);
    if (!template) {
      throw new Error(`Template not found: ${name}`);
    }

    return {
      title: template.title ? template.title(data) : undefined,
      body: template.body(data),
    };
  }

  /**
   * Parse a template file with frontmatter-style title.
   *
   * Supported formats:
   * 1. Frontmatter (---):
   *    ```
   *    ---
   *    title: Hello {{name}}
   *    ---
   *    Body content here.
   *    ```
   *
   * 2. Plain body (no title):
   *    ```
   *    Just body content.
   *    ```
   */
  private parseTemplateFile(content: string): { title?: string; body: string } {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);

    if (match) {
      const frontmatter = match[1] ?? '';
      const body = match[2]?.trim() ?? '';

      // Parse title from frontmatter
      const titleMatch = frontmatter.match(/^title:\s*(.+)$/m);
      const title = titleMatch?.[1]?.trim();

      return { title, body };
    }

    // No frontmatter, entire content is body
    return { body: content.trim() };
  }

  /**
   * List all registered template names.
   */
  list(): string[] {
    return Array.from(this.templates.keys());
  }

  /**
   * Clear all registered templates.
   */
  clear(): void {
    this.templates.clear();
  }
}
