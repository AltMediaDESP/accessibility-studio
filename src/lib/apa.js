// APA 7th edition references for the same two cases as mla.js: a part of something
// (journal article, chapter, web page or news article) or a whole work (book or
// report). See cite-common.js for the shape of a source.
//
// APA wants titles of articles and books in sentence case (only the first word and
// proper nouns capitalized). That can't be done automatically without breaking
// proper nouns, so titles are used as typed and the page reminds people.

import { escape, close, cleanAuthors, cleanDate, MONTHS, pageRange, doiUrl, isUrl, render } from './cite-common.js';

/** "Jane Marie" → "J. M.", "Jean-Paul" → "J.-P." */
export function initials(first) {
  return first
    .split(/\s+/)
    .filter(Boolean)
    .map((name) =>
      name
        .split('-')
        .map((part) => (part ? part[0].toUpperCase() + '.' : ''))
        .join('-'),
    )
    .join(' ');
}

function apaName(a) {
  if (!a.last) return a.first; // a group or single-name author
  return a.first ? `${a.last}, ${initials(a.first)}` : a.last;
}

/**
 * Up to 20 authors are all listed, with "&" before the last; with 21 or more,
 * the first 19, an ellipsis, and the last.
 */
export function authorList(authors) {
  const names = cleanAuthors(authors).map(apaName);
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length <= 20) return `${names.slice(0, -1).join(', ')}, & ${names[names.length - 1]}`;
  return `${names.slice(0, 19).join(', ')}, . . . ${names[names.length - 1]}`;
}

/** "(2024)", "(2024, March)", "(2024, March 12)" or "(n.d.)". */
export function formatDate(date) {
  const { year, month, day } = cleanDate(date);
  if (!year) return '(n.d.)';
  const m = MONTHS[Number(month) - 1];
  if (!m) return `(${year})`;
  return day ? `(${year}, ${m} ${day})` : `(${year}, ${m})`;
}

/** The reference list entry. */
export function reference(source) {
  const authors = authorList(source.authors);
  const title = (source.title || '').trim();
  // Journal articles (they have a volume) use the year only; news and web pages use the full date.
  const journal = source.kind !== 'whole' && (source.volume || '').trim();
  const date = formatDate(journal ? { year: cleanDate(source.date).year } : source.date);
  const parts = [];
  const push = (text, italic = false) => text && parts.push({ text, italic });

  // With no author, the title moves to the front.
  if (authors) {
    push(close(authors, '.') + ' ');
    push(`${date}. `);
  }

  const container = source.kind === 'whole' ? '' : (source.container || '').trim();
  const volume = (source.volume || '').trim();
  const issue = (source.issue || '').trim();
  const pages = pageRange(source.location);

  if (title) {
    // A part with a container keeps its title plain; a whole work, or a web page
    // that stands alone, is italic.
    const italic = source.kind === 'whole' || !container;
    push(title, italic);
    push(/[.?!]$/.test(title) ? ' ' : '. ');
  }
  if (!authors) push(`${date}. `);

  if (container) {
    push(container, true);
    if (volume) {
      push(', ');
      push(volume, true);
    }
    if (issue) push(`(${issue})`);
    if (pages) push(`, ${pages.first}${pages.last ? `–${pages.last}` : ''}`);
    push('. ');
  }

  const publisher = (source.publisher || '').trim();
  // The publisher is left out when it is the same as the author or the website.
  const sameAsAuthor = authors && cleanAuthors(source.authors).length === 1 && publisher === authors;
  if (publisher && publisher !== container && !sameAsAuthor) push(close(publisher, '.') + ' ');

  const doi = doiUrl(source.location);
  if (doi) push(doi);
  else if (isUrl(source.location)) push(source.location.trim());

  return render(parts);
}

/** The in-text citation, e.g. "quote" (Doe, 2024, p. 42). */
export function inText(source, quote = '') {
  const list = cleanAuthors(source.authors);
  const lastName = (a) => a.last || a.first;
  const { year } = cleanDate(source.date);
  const when = year || 'n.d.';
  let who;
  let whoHtml;
  if (list.length === 1) who = lastName(list[0]);
  else if (list.length === 2) who = `${lastName(list[0])} & ${lastName(list[1])}`;
  else if (list.length > 2) who = `${lastName(list[0])} et al.`;
  if (who) {
    whoHtml = escape(who);
  } else {
    const title = (source.title || 'Untitled').trim().replace(/[.?!]$/, '');
    const short = title.split(/\s+/).slice(0, 4).join(' ');
    const italic = source.kind === 'whole' || !(source.container || '').trim();
    who = italic ? short : `“${short},”`;
    whoHtml = italic ? `<i>${escape(short)}</i>` : escape(who);
  }
  const sep = who.endsWith(',”') ? ' ' : ', ';

  const pages = pageRange(source.location);
  const page = pages ? (pages.last ? `, pp. ${pages.first}–${pages.last}` : `, p. ${pages.first}`) : '';

  const cite = `(${who}${sep}${when}${page})`;
  const citeHtml = `(${whoHtml}${sep}${when}${page})`;
  const q = quote.trim().replace(/^["“]|["”]$/g, '');
  if (!q) return { text: cite, html: citeHtml };
  const body = q.replace(/\.$/, '');
  return { text: `“${body}” ${cite}.`, html: `“${escape(body)}” ${citeHtml}.` };
}
