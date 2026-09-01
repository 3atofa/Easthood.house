/**
 * URL-safe slug from a title. Deliberately conservative: lowercase ASCII,
 * dashes between words, no leading or trailing dash.
 */
export const slugify = value =>
  String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 160);
