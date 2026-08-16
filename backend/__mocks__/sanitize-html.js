// Manual Jest mock — the real `sanitize-html` pulls in an ESM-only
// htmlparser2/domutils/domhandler/entities chain that ts-jest can't
// transform without deeper config surgery. No test in this suite currently
// exercises sanitization behavior itself (feature 003 has no dedicated test
// tasks per its tasks.md), so a plain tag-strip stand-in is enough to keep
// every other suite's module graph loadable. The real package is still used
// at runtime (dev server, build) — this only applies under Jest.
module.exports = function sanitizeHtml(html) {
  return typeof html === 'string' ? html.replace(/<[^>]*>/g, '') : '';
};
