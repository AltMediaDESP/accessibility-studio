// Works out what a link points to from its address, to suggest link text like
// "Week 1 Overview (Canvas Page)". `readable` is false when the address has no
// words in it (a document ID or a number), because then there is nothing honest
// to suggest and a person has to describe the link.

const SKIP_SEGMENTS = new Set(['view', 'edit', 'preview', 'download', 'index.html', 'index.htm', 'u', '0', '1', '2', 'd', 'e', 'file']);

export function describeUrl(href) {
  let url;
  try {
    url = new URL(href);
  } catch {
    return { type: 'web page', label: href, readable: false };
  }
  if (url.protocol === 'mailto:') {
    const address = decodeURIComponent(url.pathname);
    return { type: 'email address', label: `Email ${address}`, readable: true };
  }

  const host = url.hostname.replace(/^www\./, '');
  const path = url.pathname;
  const type = linkType(host, path);

  const segments = path
    .split('/')
    .map((s) => safeDecode(s))
    .filter((s) => s && !SKIP_SEGMENTS.has(s.toLowerCase()));
  const last = segments[segments.length - 1];

  // A site's home page: the site name is the honest label.
  if (!last) return { type, label: host, readable: true };

  const words = last
    .replace(/\.(html?|php|aspx?|pdf|docx?|pptx?|xlsx?)$/i, '')
    .replace(/[-_+.]+/g, ' ')
    .trim();
  if (!looksReadable(words)) return { type, label: `${type}`, readable: false };

  let title = words.replace(/\b\w/g, (c) => c.toUpperCase());
  if (title.length > 60) title = title.slice(0, 59).trimEnd() + '…';
  return { type, label: `${title} (${type})`, readable: true };
}

function safeDecode(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/** True when text reads as words, not an ID like "1AbCdEf9xYz" or "84213". */
export function looksReadable(text) {
  const tokens = text.split(/\s+/).filter(Boolean);
  if (!tokens.length) return false;
  const idLike = (t) =>
    /^\d+$/.test(t) || // a number
    (t.length >= 8 && /\d/.test(t) && /[a-z]/i.test(t)) || // letters and digits mixed
    (t.length >= 8 && /^[0-9a-f]+$/i.test(t)) || // hex
    t.length > 24;
  if (tokens.some(idLike)) return false;
  return tokens.some((t) => /^[a-z]{3,}$/i.test(t));
}

function linkType(host, path) {
  if (host === 'docs.google.com') {
    if (path.startsWith('/document/')) return 'Google Doc';
    if (path.startsWith('/spreadsheets/')) return 'Google Sheet';
    if (path.startsWith('/presentation/')) return 'Google Slides';
    if (path.startsWith('/forms/')) return 'Google Form';
    return 'Google Drive file';
  }
  if (host === 'drive.google.com') return 'Google Drive file';
  if (host.includes('instructure.com') || host.startsWith('canvas.') || host.includes('.canvas.')) {
    if (path.includes('/assignments/')) return 'Canvas Assignment';
    if (path.includes('/discussion_topics/')) return 'Canvas Discussion';
    if (path.includes('/quizzes/')) return 'Canvas Quiz';
    if (path.includes('/files/')) return 'Canvas File';
    if (path.includes('/modules')) return 'Canvas Module';
    if (path.includes('/announcements')) return 'Canvas Announcement';
    return 'Canvas Page';
  }
  if (host === 'youtube.com' || host === 'youtu.be' || host === 'm.youtube.com') return 'YouTube video';
  if (host === 'vimeo.com') return 'Vimeo video';
  if (host.endsWith('wikipedia.org')) return 'Wikipedia';
  if (/\.pdf$/i.test(path)) return 'PDF';
  if (/\.docx?$/i.test(path)) return 'Word document';
  if (/\.pptx?$/i.test(path)) return 'PowerPoint';
  if (/\.xlsx?$/i.test(path)) return 'Excel spreadsheet';
  return 'web page';
}
