/**
 * Utility functions for handling HTML content safely
 */

/**
 * Strip HTML tags from a string and return plain text
 * @param html - HTML string to strip
 * @returns Plain text without HTML tags
 */
export function stripHTML(html: string | null | undefined): string {
  if (!html) return '';
  
  // Create a temporary DOM element to parse HTML
  if (typeof window !== 'undefined') {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
  }
  
  // Fallback for server-side: use regex to strip HTML tags
  return html.replace(/<[^>]*>/g, '').trim();
}

/**
 * Truncate text to a specific length with ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text with ellipsis if needed
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

/**
 * Convert HTML content to safe display text
 * @param html - HTML content
 * @param maxLength - Optional maximum length
 * @returns Safe display text
 */
export function htmlToDisplayText(html: string | null | undefined, maxLength?: number): string {
  const plainText = stripHTML(html);
  if (maxLength) {
    return truncateText(plainText, maxLength);
  }
  return plainText;
}