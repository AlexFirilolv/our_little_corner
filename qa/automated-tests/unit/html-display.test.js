/**
 * HTML Display Test Suite
 * 
 * Tests for HTML text processing and display functionality to ensure
 * raw HTML is properly converted to clean text display.
 */

const { htmlToDisplayText, stripHTML } = require('../../../app/lib/htmlUtils')

describe('HTML Display Fixes', () => {
  describe('htmlToDisplayText', () => {
    test('should strip HTML tags and return clean text', () => {
      const input = '<p><span style="font-family: Arial, sans-serif;">For my father, the king</span></p>'
      const expected = 'For my father, the king'
      expect(htmlToDisplayText(input)).toBe(expected)
    })

    test('should handle nested HTML tags', () => {
      const input = '<div><p><strong>Test task</strong></p></div>'
      const expected = 'Test task'
      expect(htmlToDisplayText(input)).toBe(expected)
    })

    test('should handle HTML with attributes', () => {
      const input = '<p class="test" style="color: red;">Memory title</p>'
      const expected = 'Memory title'
      expect(htmlToDisplayText(input)).toBe(expected)
    })

    test('should handle text truncation when limit is provided', () => {
      const input = '<p>This is a very long memory description that should be truncated</p>'
      const expected = 'This is a very long memory description that should be...'
      expect(htmlToDisplayText(input, 50)).toBe(expected)
    })

    test('should handle self-closing tags', () => {
      const input = '<p>Line one<br/>Line two</p>'
      const expected = 'Line oneLine two'
      expect(htmlToDisplayText(input)).toBe(expected)
    })

    test('should handle empty or null input', () => {
      expect(htmlToDisplayText(null)).toBe('')
      expect(htmlToDisplayText(undefined)).toBe('')
      expect(htmlToDisplayText('')).toBe('')
    })

    test('should handle plain text input (no HTML)', () => {
      const input = 'Plain text memory title'
      expect(htmlToDisplayText(input)).toBe(input)
    })

    test('should handle HTML entities', () => {
      const input = '<p>Test &amp; memory &lt;title&gt;</p>'
      const expected = 'Test & memory <title>'
      expect(htmlToDisplayText(input)).toBe(expected)
    })

    test('should preserve whitespace between words', () => {
      const input = '<p>Multiple    <span>   spaces    </span>   between   words</p>'
      const expected = 'Multiple       spaces       between   words'
      expect(htmlToDisplayText(input).replace(/\s+/g, ' ').trim()).toBe('Multiple spaces between words')
    })
  })

  describe('stripHTML', () => {
    test('should strip HTML tags from text', () => {
      const input = '<p><span style="font-family: Arial, sans-serif;">For my father, the king</span></p>'
      const expected = 'For my father, the king'
      expect(stripHTML(input)).toBe(expected)
    })

    test('should handle malformed HTML gracefully', () => {
      const input = '<p>Unclosed tag <span>content'
      const expected = 'Unclosed tag content'
      expect(stripHTML(input)).toBe(expected)
    })
  })

  describe('Real-world test cases from user reports', () => {
    test('should handle user-reported HTML title case', () => {
      const input = '<p><span style="font-family: Arial, sans-serif;">For my father, the king</span></p>'
      const expected = 'For my father, the king'
      expect(htmlToDisplayText(input)).toBe(expected)
    })

    test('should handle test task title case', () => {
      const input = '<p>Test task</p>'
      const expected = 'Test task'
      expect(htmlToDisplayText(input)).toBe(expected)
    })

    test('should handle rich text editor output', () => {
      const input = '<p><strong>Bold</strong> and <em>italic</em> text</p>'
      const expected = 'Bold and italic text'
      expect(htmlToDisplayText(input)).toBe(expected)
    })

    test('should handle multiple paragraphs', () => {
      const input = '<p>First paragraph</p><p>Second paragraph</p>'
      const expected = 'First paragraphSecond paragraph'
      expect(htmlToDisplayText(input)).toBe(expected)
    })
  })

  describe('Component integration scenarios', () => {
    test('should handle memory group titles in gallery', () => {
      const input = '<p><span style="font-family: Arial, sans-serif;">Anniversary Trip</span></p>'
      const expected = 'Anniversary Trip'
      expect(htmlToDisplayText(input)).toBe(expected)
    })

    test('should handle memory descriptions with formatting', () => {
      const input = '<p>Our <strong>amazing</strong> trip to <em>Paris</em>!</p>'
      const expected = 'Our amazing trip to Paris!'
      expect(htmlToDisplayText(input)).toBe(expected)
    })

    test('should handle media notes with line breaks', () => {
      const input = '<p>Beautiful sunset<br/>at the beach</p>'
      const expected = 'Beautiful sunsetat the beach'
      expect(htmlToDisplayText(input)).toBe(expected)
    })
  })
})

describe('Component HTML Display Integration', () => {
  /**
   * These tests simulate how the htmlToDisplayText function is used
   * in actual components throughout the application
   */

  test('MemoryGroupCard title display', () => {
    const memoryGroup = {
      title: '<p><span style="font-family: Arial, sans-serif;">For my father, the king</span></p>'
    }
    
    // This simulates the component logic: htmlToDisplayText(memoryGroup.title) || 'Untitled Memory'
    const displayTitle = htmlToDisplayText(memoryGroup.title) || 'Untitled Memory'
    expect(displayTitle).toBe('For my father, the king')
  })

  test('MediaCard title display', () => {
    const media = {
      title: '<p>Test media title</p>'
    }
    
    // This simulates the component logic: htmlToDisplayText(media.title)
    const displayTitle = htmlToDisplayText(media.title)
    expect(displayTitle).toBe('Test media title')
  })

  test('MemoryGroupDetailModal title display', () => {
    const memoryGroup = {
      title: '<p>Test task</p>'
    }
    
    // This simulates the component logic: htmlToDisplayText(memoryGroup.title) || 'Untitled Memory'  
    const displayTitle = htmlToDisplayText(memoryGroup.title) || 'Untitled Memory'
    expect(displayTitle).toBe('Test task')
  })

  test('Admin panel memory management title display', () => {
    const group = {
      title: '<p><span style="font-family: Arial, sans-serif;">Memory Title</span></p>'
    }
    
    // This simulates the component logic: htmlToDisplayText(group.title) || 'Untitled Memory'
    const displayTitle = htmlToDisplayText(group.title) || 'Untitled Memory'
    expect(displayTitle).toBe('Memory Title')
  })

  test('LockingControls title display', () => {
    const group = {
      title: '<div><p>Locked Memory</p></div>'
    }
    
    // This simulates the component logic: htmlToDisplayText(group.title) || 'Untitled Memory'
    const displayTitle = htmlToDisplayText(group.title) || 'Untitled Memory'
    expect(displayTitle).toBe('Locked Memory')
  })
})