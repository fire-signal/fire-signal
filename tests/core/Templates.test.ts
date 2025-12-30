import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TemplateManager } from '../../src/core/templates';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';

describe('TemplateManager', () => {
  let manager: TemplateManager;
  const tempDir = join(__dirname, '.temp-templates');

  beforeEach(async () => {
    manager = new TemplateManager();
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('registerInline', () => {
    it('should register and render inline template with body only', () => {
      manager.registerInline('simple', {
        body: 'Hello, {{name}}!',
      });

      const message = manager.render('simple', { name: 'World' });

      expect(message.body).toBe('Hello, World!');
      expect(message.title).toBeUndefined();
    });

    it('should register and render inline template with title and body', () => {
      manager.registerInline('welcome', {
        title: 'Welcome, {{name}}!',
        body: 'Thank you for joining {{company}}.',
      });

      const message = manager.render('welcome', {
        name: 'John',
        company: 'Acme Corp',
      });

      expect(message.title).toBe('Welcome, John!');
      expect(message.body).toBe('Thank you for joining Acme Corp.');
    });

    it('should handle missing variables gracefully', () => {
      manager.registerInline('test', {
        body: 'Hello, {{name}}!',
      });

      const message = manager.render('test', {});

      expect(message.body).toBe('Hello, !');
    });
  });

  describe('register (file)', () => {
    it('should register template from file with frontmatter', async () => {
      const templatePath = join(tempDir, 'welcome.hbs');
      await writeFile(
        templatePath,
        `---
title: Hello {{name}}
---
Welcome to our service!

Best regards,
The Team`
      );

      await manager.register('welcome', templatePath);
      const message = manager.render('welcome', { name: 'John' });

      expect(message.title).toBe('Hello John');
      expect(message.body).toContain('Welcome to our service!');
      expect(message.body).toContain('The Team');
    });

    it('should register template from file without frontmatter', async () => {
      const templatePath = join(tempDir, 'simple.hbs');
      await writeFile(templatePath, 'Hello, {{name}}!');

      await manager.register('simple', templatePath);
      const message = manager.render('simple', { name: 'World' });

      expect(message.title).toBeUndefined();
      expect(message.body).toBe('Hello, World!');
    });

    it('should throw error for non-existent file', async () => {
      await expect(
        manager.register('missing', '/nonexistent/path.hbs')
      ).rejects.toThrow('Template file not found');
    });
  });

  describe('render', () => {
    it('should throw error for unregistered template', () => {
      expect(() => manager.render('unknown', {})).toThrow(
        'Template not found: unknown'
      );
    });

    it('should handle complex data structures', () => {
      manager.registerInline('report', {
        title: 'Report for {{date}}',
        body: 'User: {{user.name}} ({{user.email}})\nItems: {{items.length}}',
      });

      const message = manager.render('report', {
        date: '2025-12-31',
        user: { name: 'John', email: 'john@example.com' },
        items: [1, 2, 3],
      });

      expect(message.title).toBe('Report for 2025-12-31');
      expect(message.body).toContain('John');
      expect(message.body).toContain('john@example.com');
    });
  });

  describe('has', () => {
    it('should return true for registered templates', () => {
      manager.registerInline('test', { body: 'Hello' });

      expect(manager.has('test')).toBe(true);
      expect(manager.has('unknown')).toBe(false);
    });
  });

  describe('list', () => {
    it('should list all registered template names', () => {
      manager.registerInline('a', { body: 'A' });
      manager.registerInline('b', { body: 'B' });
      manager.registerInline('c', { body: 'C' });

      const names = manager.list();

      expect(names).toHaveLength(3);
      expect(names).toContain('a');
      expect(names).toContain('b');
      expect(names).toContain('c');
    });
  });

  describe('clear', () => {
    it('should remove all registered templates', () => {
      manager.registerInline('test', { body: 'Hello' });
      expect(manager.has('test')).toBe(true);

      manager.clear();
      expect(manager.has('test')).toBe(false);
    });
  });
});
