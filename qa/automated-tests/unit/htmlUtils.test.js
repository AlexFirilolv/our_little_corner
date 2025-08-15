/**
 * Unit tests for HTML utility functions
 * Tests the stripHTML and htmlToDisplayText functions
 */

const { stripHTML, htmlToDisplayText, truncateText } = require('../../../app/lib/htmlUtils');

describe('HTML Utilities', () => {
  describe('stripHTML', () => {
    test('should remove simple HTML tags', () => {
      expect(stripHTML('<p>Hello World</p>')).toBe('Hello World');
      expect(stripHTML('<div><span>Test</span></div>')).toBe('Test');
    });

    test('should handle nested HTML tags', () => {
      expect(stripHTML('<div><p><strong>Bold</strong> text</p></div>')).toBe('Bold text');
    });

    test('should handle HTML with attributes', () => {
      expect(stripHTML('<p class="test" id="para">Content</p>')).toBe('Content');
    });

    test('should handle empty and null inputs', () => {
      expect(stripHTML('')).toBe('');
      expect(stripHTML(null)).toBe('');
      expect(stripHTML(undefined)).toBe('');
    });

    test('should handle text without HTML tags', () => {
      expect(stripHTML('Plain text')).toBe('Plain text');
    });

    test('should handle malformed HTML', () => {
      expect(stripHTML('<p>Unclosed tag')).toBe('Unclosed tag');
      expect(stripHTML('Text with < and > symbols')).toBe('Text with < and > symbols');
    });
  });

  describe('truncateText', () => {
    test('should truncate long text', () => {
      expect(truncateText('This is a very long text', 10)).toBe('This is a...');
    });

    test('should not truncate short text', () => {
      expect(truncateText('Short', 10)).toBe('Short');
    });

    test('should handle exact length match', () => {
      expect(truncateText('Exactly10', 9)).toBe('Exactly10');
      expect(truncateText('Exactly10', 8)).toBe('Exactly1...');
    });
  });

  describe('htmlToDisplayText', () => {
    test('should strip HTML and optionally truncate', () => {
      expect(htmlToDisplayText('<p>Hello World</p>')).toBe('Hello World');
      expect(htmlToDisplayText('<p>This is a long text</p>', 10)).toBe('This is a...');
    });

    test('should handle complex HTML structures', () => {
      const complexHTML = '<div><h1>Title</h1><p>Paragraph with <strong>bold</strong> text</p></div>';
      expect(htmlToDisplayText(complexHTML)).toBe('TitleParagraph with bold text');
    });

    test('should handle memory group titles from the app', () => {
      expect(htmlToDisplayText('<p>test222</p>')).toBe('test222');
      expect(htmlToDisplayText('<p dir="rtl"><span style="font-family: &quot;Noto Sans Hebrew&quot;, sans-serif;">tstes</span></p>')).toBe('tstes');
    });
  });
});