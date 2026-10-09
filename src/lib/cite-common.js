// Pieces shared by the MLA and APA formatters.

/**
 * @typedef {object} Source
 * @property {'part'|'whole'} kind  part of something (article, chapter, web page) or a whole book/website
 * @property {{first: string, last: string}[]} authors
 * @property {string} title
 * @property {string} container   website, journal or book the part is in
 * @property {string} volume
 * @property {string} issue
 * @property {string} publisher
 * @property {{year: string, month: string, day: string}} date   month is "1"–"12" or ""
 * @property {string} location    page numbers ("42" or "12-15"), a web address or a DOI
 * @property {string} accessed    access date as text (MLA only)
 */

export const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Adds a closing mark unless the text already ends with one. */
export function close(text, mark) {
  const t = text.trim();
  if (!t) return '';
  return /[.?!]$/.test(t) ? t : t + mark;
}

export function cleanAuthors(authors) {
  return (authors || [])
    .map((a) => ({ first: (a.first || '').trim(), last: (a.last || '').trim() }))
    .filter((a) => a.first || a.last);
}

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function cleanDate(date) {
  if (typeof date === 'string') return { year: date.trim(), month: '', day: '' };
  return {
    year: (date?.year || '').trim(),
    month: (date?.month || '').trim(),
    day: (date?.day || '').trim(),
  };
}

/** "45", "45-67" or "45–67" → {first, last} or null when it isn't a page reference. */
export function pageRange(location) {
  const m = (location || '').trim().match(/^(\d+)(?:\s*[-–]\s*(\d+))?$/);
  if (!m) return null;
  return { first: m[1], last: m[2] || '' };
}

/** A DOI in any common form, normalized to https://doi.org/…, or null. */
export function doiUrl(location) {
  const m = (location || '').trim().match(/^(?:https?:\/\/(?:dx\.)?doi\.org\/|doi:\s*)?(10\.\d{4,9}\/\S+)$/i);
  return m ? `https://doi.org/${m[1]}` : null;
}

export function isUrl(location) {
  return /^https?:\/\//i.test((location || '').trim());
}

/** Joins parts made of {text, italic} into plain text and HTML. */
export function render(parts) {
  const text = parts.map((p) => p.text).join('').replace(/\s+/g, ' ').trim();
  const html = parts
    .map((p) => (p.italic ? `<i>${escape(p.text)}</i>` : escape(p.text)))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
  return { text, html };
}
