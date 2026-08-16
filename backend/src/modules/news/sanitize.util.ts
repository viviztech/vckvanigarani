import sanitizeHtml from 'sanitize-html';

/**
 * research.md §3: a small allow-list (paragraphs, bold/italic, lists,
 * links, images) — applied on every write (T020), not just at render time,
 * since a client-side-only sanitizer is trivially bypassable via direct API
 * calls.
 */
export function sanitizeNewsBody(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ['p', 'br', 'b', 'strong', 'i', 'em', 'ul', 'ol', 'li', 'a', 'img'],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt'],
    },
    allowedSchemes: ['http', 'https'],
  });
}
