// MLA 9th edition citations for the common cases: an article, chapter or web page
// that is part of something bigger ("part"), or a book or whole website on its own
// ("whole"). Each citation comes back as plain text and as HTML with the italics
// MLA requires, so it pastes into Google Docs correctly.

/**
 * @typedef {object} Source
 * @property {'part'|'whole'} kind
 * @property {{first: string, last: string}[]} authors
 * @property {string} title       article, chapter or page title (part) or book/site title (whole)
 * @property {string} container   website, journal or book the part is in
 * @property {string} publisher
 * @property {string} date        as it should appear, e.g. "2024" or "12 Mar. 2024"
 * @property {string} location    page numbers ("42" or "12-15") or a URL
 * @property {string} accessed    optional access date for web sources
 */

const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Adds a closing mark unless the text already ends with one. */
function close(text, mark) {
  const t = text.trim();
  if (!t) return '';
  return /[.?!]$/.test(t) ? t : t + mark;
}

function cleanAuthors(authors) {
  return (authors || [])
    .map((a) => ({ first: (a.first || '').trim(), last: (a.last || '').trim() }))
    .filter((a) => a.first || a.last);
}

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

/** "p. 42", "pp. 12-15" or a URL without "https://". */
export function formatLocation(location) {
  const loc = (location || '').trim();
  if (!loc) return '';
  if (/^https?:\/\//i.test(loc)) return loc.replace(/^https?:\/\//i, '');
  if (/^\d+\s*[-–]\s*\d+$/.test(loc)) return `pp. ${loc.replace(/\s*[-–]\s*/, '-')}`;
  if (/^\d+$/.test(loc)) return `p. ${loc}`;
  return loc;
}

/** The Works Cited entry. */
export function worksCited(source) {
  const authors = authorList(source.authors);
  const title = (source.title || '').trim();
  const parts = []; // [{text, italic}]
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
  if (source.publisher?.trim()) tail.push({ text: source.publisher.trim() });
  if (source.date?.trim()) tail.push({ text: source.date.trim() });
  const location = formatLocation(source.location);
  if (location) tail.push({ text: location });
  tail.forEach((item, i) => {
    push(item.text, item.italic);
    push(i < tail.length - 1 ? ', ' : '.');
  });

  if (source.accessed?.trim()) push(` Accessed ${close(source.accessed.trim(), '.')}`);

  const textOut = parts.map((p) => p.text).join('').trim();
  const htmlOut = parts.map((p) => (p.italic ? `<i>${escape(p.text)}</i>` : escape(p.text))).join('').trim();
  return { text: textOut || '', html: htmlOut || '' };
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

  const loc = (source.location || '').trim();
  const page = /^\d+(\s*[-–]\s*\d+)?$/.test(loc) ? ` ${loc.replace(/\s*[-–]\s*/, '-')}` : '';

  const q = quote.trim().replace(/^["“]|["”]$/g, '');
  if (!q) {
    return { text: `(${who}${page})`, html: `(${whoHtml}${page})` };
  }
  // A question or exclamation mark stays inside the quotation marks; a period moves after the citation.
  const body = q.replace(/\.$/, '');
  return {
    text: `“${body}” (${who}${page}).`,
    html: `“${escape(body)}” (${whoHtml}${page}).`,
  };
}
