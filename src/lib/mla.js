// MLA 9th edition citations for the common cases: an article, chapter or web page
// that is part of something bigger ("part"), or a book or whole website on its own
// ("whole"). Each citation comes back as plain text and as HTML with the italics
// MLA requires, so it pastes into Google Docs correctly. See cite-common.js for the
// shape of a source.

import { escape, close, cleanAuthors, cleanDate, pageRange, doiUrl, isUrl, render } from './cite-common.js';

// MLA abbreviates months longer than four letters.
const MLA_MONTHS = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'];

function fullName(a) {
  return [a.first, a.last].filter(Boolean).join(' ');
}

function invertedName(a) {
  return a.last && a.first ? `${a.last}, ${a.first}` : a.last || a.first;
}

/** "Doe, Jane", "Doe, Jane, and John Smith" or "Doe, Jane, et al." */
export function authorList(authors) {
  const list = cleanAuthors(authors);
  if (list.length === 0) return '';
  if (list.length === 1) return invertedName(list[0]);
  if (list.length === 2) return `${invertedName(list[0])}, and ${fullName(list[1])}`;
  return `${invertedName(list[0])}, et al`;
}

/** "2024", "Mar. 2024" or "12 Mar. 2024". */
export function formatDate(date) {
  const { year, month, day } = cleanDate(date);
  if (!year) return '';
  const m = MLA_MONTHS[Number(month) - 1];
  if (!m) return year;
  return day ? `${day} ${m} ${year}` : `${m} ${year}`;
}

/** "p. 42", "pp. 12-15", a DOI as https://doi.org/…, or a URL without "https://". */
export function formatLocation(location) {
  const loc = (location || '').trim();
  if (!loc) return '';
  const doi = doiUrl(loc);
  if (doi) return doi;
  if (isUrl(loc)) return loc.replace(/^https?:\/\//i, '');
  const pages = pageRange(loc);
  if (pages) return pages.last ? `pp. ${pages.first}-${pages.last}` : `p. ${pages.first}`;
  return loc;
}

/** The Works Cited entry. */
export function worksCited(source) {
  const authors = authorList(source.authors);
  const title = (source.title || '').trim();
  const parts = [];
  const push = (text, italic = false) => text && parts.push({ text, italic });

  if (authors) push(close(authors, '.') + ' ');

  if (source.kind === 'whole') {
    if (title) {
      push(title, true);
      push(/[.?!]$/.test(title) ? ' ' : '. ');
    }
  } else if (title) {
    push(`“${close(title, '.')}” `);
  }

  // The container and the facts after it are separated by commas; the last one ends with a period.
  const tail = [];
  if (source.kind !== 'whole' && source.container?.trim()) tail.push({ text: source.container.trim(), italic: true });
  if (source.volume?.trim()) tail.push({ text: `vol. ${source.volume.trim()}` });
  if (source.issue?.trim()) tail.push({ text: `no. ${source.issue.trim()}` });
  if (source.publisher?.trim()) tail.push({ text: source.publisher.trim() });
  const date = formatDate(source.date);
  if (date) tail.push({ text: date });
  const location = formatLocation(source.location);
  if (location) tail.push({ text: location });
  tail.forEach((item, i) => {
    push(item.text, item.italic);
    push(i < tail.length - 1 ? ', ' : '.');
  });

  if (source.accessed?.trim()) push(` Accessed ${close(source.accessed.trim(), '.')}`);
  return render(parts);
}

/** The in-text citation, e.g. "quote" (Doe 42). */
export function inText(source, quote = '') {
  const list = cleanAuthors(source.authors);
  const lastName = (a) => a.last || a.first;
  let who;
  let whoHtml;
  if (list.length === 1) who = lastName(list[0]);
  else if (list.length === 2) who = `${lastName(list[0])} and ${lastName(list[1])}`;
  else if (list.length > 2) who = `${lastName(list[0])} et al.`;
  if (who) {
    whoHtml = escape(who);
  } else {
    // No author: a shortened title (first few words), in quotes or italics like the entry.
    const title = (source.title || 'Untitled').trim().replace(/[.?!]$/, '');
    const short = title.split(/\s+/).slice(0, 4).join(' ');
    who = source.kind === 'whole' ? short : `“${short}”`;
    whoHtml = source.kind === 'whole' ? `<i>${escape(short)}</i>` : escape(who);
  }

  const pages = pageRange(source.location);
  const page = pages ? ` ${pages.first}${pages.last ? `-${pages.last}` : ''}` : '';

  const q = quote.trim().replace(/^["“]|["”]$/g, '');
  if (!q) return { text: `(${who}${page})`, html: `(${whoHtml}${page})` };
  // A question or exclamation mark stays inside the quotation marks; a period moves after the citation.
  const body = q.replace(/\.$/, '');
  return { text: `“${body}” (${who}${page}).`, html: `“${escape(body)}” (${whoHtml}${page}).` };
}
