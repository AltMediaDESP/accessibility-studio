// Turns HTML pasted from Canvas, Word, Google Docs or PowerPoint into clean,
// accessible HTML that pastes well into Google Docs.
//
// cleanHtml() never invents content. When it can fix something safely (a heading
// that was only styled to look like one, a "click here" link whose address has a
// readable name) it does, and lists the change as "fixed". When only a person can
// fix it (an image description, a link to a document with an unreadable address)
// it marks the spot and lists it as "review".
//
// It takes the browser's `window` (or a jsdom window in tests) so it runs the same
// way in both.

import createDOMPurify from 'dompurify';
import { describeUrl } from './links.js';
import { parseColor, contrastWithWhite, isNeutral } from './color.js';

const ALLOWED_TAGS = [
  'p', 'div', 'span', 'br', 'b', 'strong', 'i', 'em', 'u', 'a', 'img', 'font',
  'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code', 'sub', 'sup',
  'section', 'article', 'header', 'footer', 'main', 'center',
];
const ALLOWED_ATTR = ['href', 'src', 'alt', 'style', 'colspan', 'rowspan', 'scope', 'type', 'start', 'bgcolor', 'color'];

const HEADING_TAGS = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'];
const BLOCK_TAGS = ['P', 'DIV', 'UL', 'OL', 'LI', 'TABLE', 'BLOCKQUOTE', 'PRE', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER', 'MAIN', 'CENTER', ...HEADING_TAGS];
const WRAPPER_TAGS = ['DIV', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER', 'MAIN', 'CENTER'];

export const DEFAULT_OPTIONS = {
  removeEmoji: true,
  standardFormatting: true,
};

/**
 * @param {string} html  the pasted HTML
 * @param {Window} window  the browser window, or a jsdom window
 * @param {object} [options]  see DEFAULT_OPTIONS
 * @returns {{html: string, changes: Array<object>}}
 */
export function cleanHtml(html, window, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const purify = createDOMPurify(window);
  const safe = purify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR, KEEP_CONTENT: true });
  const doc = new window.DOMParser().parseFromString(`<body>${safe}</body>`, 'text/html');
  const body = doc.body;
  const log = new ChangeLog();
  const ctx = { doc, body, window, log };

  replaceNbsp(ctx);
  convertLineBreaks(ctx);
  unwrapPlainBold(ctx);
  normalizeBlocks(ctx);
  removeEmptyBlocks(ctx, true);
  joinTimeFragments(ctx);
  detectHeadings(ctx);
  fixHeadingLevels(ctx);
  detectLists(ctx);
  fixTables(ctx);
  keepMeaningfulColors(ctx);
  removeUnderlines(ctx);
  convertInlineStyles(ctx);
  stripAttributes(ctx);
  fixLinks(ctx);
  checkImages(ctx);
  if (opts.removeEmoji) removeEmoji(ctx);
  tidyWhitespace(ctx);
  removeEmptyBlocks(ctx, false);
  if (opts.standardFormatting) applyStandardFormatting(ctx);

  return { html: body.innerHTML, changes: log.items };
}

/** Plain text pasted without HTML: one paragraph per line. */
export function textToHtml(text) {
  const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '')
    .map((line) => `<p>${escape(line)}</p>`)
    .join('');
}

/** Removes the markers the review panel uses, before the HTML is copied. */
export function stripMarks(root) {
  root.querySelectorAll('[data-change]').forEach((el) => el.removeAttribute('data-change'));
  root.querySelectorAll('[data-flash]').forEach((el) => el.removeAttribute('data-flash'));
  root.querySelectorAll('[data-keep-color]').forEach((el) => el.removeAttribute('data-keep-color'));
}

// ---------- change log ----------

class ChangeLog {
  constructor() {
    this.items = [];
    this.next = 1;
  }

  /**
   * status: 'review' (a person needs to look), 'fixed' (done automatically) or 'info'.
   * target: the element the change is about; it gets a data-change attribute so the
   * review panel can find it.
   */
  add({ status, kind, title, detail = '', target = null, action = null }) {
    const id = String(this.next++);
    if (target) target.setAttribute('data-change', id);
    this.items.push({ id, status, kind, title, detail, action });
    return id;
  }
}

// ---------- small DOM helpers ----------

function unwrap(el) {
  const parent = el.parentNode;
  while (el.firstChild) parent.insertBefore(el.firstChild, el);
  el.remove();
}

function rename(el, tag) {
  const out = el.ownerDocument.createElement(tag);
  for (const attr of [...el.attributes]) out.setAttribute(attr.name, attr.value);
  while (el.firstChild) out.appendChild(el.firstChild);
  el.replaceWith(out);
  return out;
}

function textOf(el) {
  return el.textContent.replace(/\s+/g, ' ').trim();
}

function textNodes(root) {
  const walker = root.ownerDocument.createTreeWalker(root, 4 /* NodeFilter.SHOW_TEXT */);
  const out = [];
  let node;
  while ((node = walker.nextNode())) out.push(node);
  return out;
}

function hasImage(el) {
  return el.tagName === 'IMG' || !!el.querySelector?.('img');
}

function isBlock(node) {
  return node.nodeType === 1 && BLOCK_TAGS.includes(node.tagName);
}

function styleValue(el, prop) {
  return el.style?.getPropertyValue(prop)?.trim().toLowerCase() || '';
}

function quote(text, max = 40) {
  const t = text.length > max ? text.slice(0, max - 1).trimEnd() + '…' : text;
  return `“${t}”`;
}

// ---------- 1. basic cleanup ----------

function replaceNbsp({ body }) {
  for (const node of textNodes(body)) {
    if (node.data.includes(' ')) node.data = node.data.replace(/ /g, ' ');
  }
}

// Line breaks inside a paragraph are visual breaks in Canvas and Word that read badly
// in Google Docs. One break becomes a space; two or more in a row split the paragraph.
function convertLineBreaks({ body, doc }) {
  for (const br of [...body.querySelectorAll('br')]) {
    if (!br.isConnected) continue;
    const run = [br];
    let next = br.nextSibling;
    while (next && (next.nodeName === 'BR' || (next.nodeType === 3 && next.data.trim() === ''))) {
      if (next.nodeName === 'BR') run.push(next);
      next = next.nextSibling;
    }
    const block = br.parentElement?.closest('p, div, li, td, th, h1, h2, h3, h4, h5, h6');
    if (run.length >= 2 && block && ['P', 'DIV'].includes(block.tagName) && br.parentElement === block) {
      // split the block at this point
      const after = doc.createElement(block.tagName.toLowerCase());
      for (const attr of [...block.attributes]) after.setAttribute(attr.name, attr.value);
      let node = run[run.length - 1].nextSibling;
      while (node) {
        const following = node.nextSibling;
        after.appendChild(node);
        node = following;
      }
      run.forEach((b) => b.remove());
      block.after(after);
    } else {
      run.forEach((b) => b.replaceWith(doc.createTextNode(' ')));
    }
  }
}

// Google Docs wraps every paste in <b style="font-weight:normal">; that is not bold.
function unwrapPlainBold({ body }) {
  for (const el of [...body.querySelectorAll('b, strong')]) {
    const weight = styleValue(el, 'font-weight');
    if (weight === 'normal' || weight === '400' || weight === 'lighter') unwrap(el);
  }
}

// Gets rid of wrapper <div>s and makes sure every piece of text sits in a block
// (paragraph, heading, list, table…) directly under <body>.
function normalizeBlocks({ body, doc }) {
  let changed = true;
  while (changed) {
    changed = false;
    for (const el of [...body.querySelectorAll(WRAPPER_TAGS.join(','))]) {
      const hasBlockChild = [...el.children].some(isBlock);
      if (hasBlockChild) {
        unwrap(el);
      } else {
        rename(el, 'p');
      }
      changed = true;
    }
  }

  // A paragraph inside a paragraph (invalid, but pastes have it) is flattened.
  for (const p of [...body.querySelectorAll('p p')]) unwrap(p);

  // Google Docs puts a <p> inside every list item and table cell.
  for (const p of [...body.querySelectorAll('li > p, td > p, th > p')]) {
    const siblings = [...p.parentElement.children].filter((c) => c.tagName === 'P');
    if (siblings.length === 1) unwrap(p);
  }

  // Loose inline content directly under <body> goes into paragraphs.
  let run = [];
  const flush = () => {
    if (run.length && run.some((n) => (n.textContent || '').trim() !== '' || hasImage(n))) {
      const p = doc.createElement('p');
      run[0].before(p);
      run.forEach((n) => p.appendChild(n));
    } else {
      run.forEach((n) => n.remove());
    }
    run = [];
  };
  for (const node of [...body.childNodes]) {
    if (isBlock(node)) flush();
    else run.push(node);
  }
  flush();
}

function removeEmptyBlocks({ body, log }, record) {
  let count = 0;
  for (const el of [...body.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li')]) {
    if (textOf(el) === '' && !hasImage(el)) {
      el.remove();
      count++;
    }
  }
  for (const list of [...body.querySelectorAll('ul, ol')]) {
    if (!list.querySelector('li')) list.remove();
  }
  if (record && count > 0) {
    log.add({
      status: 'fixed',
      kind: 'empty',
      title: count === 1 ? 'Removed 1 empty line' : `Removed ${count} empty lines`,
      detail: 'Blank paragraphs used for spacing make screen readers announce “blank”.',
    });
  }
}

// Canvas sometimes puts the time of a due date in its own paragraph:
// "Due Friday" / "at 11:59pm". Only real time fragments are joined back.
const TIME_FRAGMENT = /^(at|by|before|until)\s+(\d{1,2}(:\d{2})?\s*([ap]\.?\s?m\.?)?|noon|midnight)(\b|$)/i;

function joinTimeFragments({ body, log }) {
  for (const p of [...body.children]) {
    if (p.tagName !== 'P') continue;
    const text = textOf(p);
    if (text.length > 40 || !TIME_FRAGMENT.test(text)) continue;
    const prev = p.previousElementSibling;
    if (!prev || !(prev.tagName === 'P' || HEADING_TAGS.includes(prev.tagName)) || textOf(prev) === '') continue;
    prev.appendChild(prev.ownerDocument.createTextNode(' '));
    while (p.firstChild) prev.appendChild(p.firstChild);
    p.remove();
    log.add({
      status: 'fixed',
      kind: 'merge',
      title: 'Joined a split line',
      detail: `${quote(text)} was on its own line; it was moved back onto the line before it.`,
      target: prev,
    });
  }
}

// ---------- 2. text measurements ----------

const KEYWORD_SIZES = {
  'xx-small': 9, 'x-small': 10, small: 13, medium: 16, large: 18, 'x-large': 24, 'xx-large': 32, 'xxx-large': 48,
};
const FONT_TAG_SIZES = { 1: 10, 2: 13, 3: 16, 4: 18, 5: 24, 6: 32, 7: 48 };

function toPx(value) {
  if (!value) return null;
  if (KEYWORD_SIZES[value]) return KEYWORD_SIZES[value];
  const m = value.match(/^([\d.]+)(px|pt|em|rem|%)$/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  switch (m[2]) {
    case 'px': return n;
    case 'pt': return (n * 4) / 3;
    case 'em':
    case 'rem': return n * 16;
    case '%': return (n / 100) * 16;
  }
  return null;
}

/** Font size (px) and weight of a text node, from the nearest styles above it. */
function textStyle(node, stop) {
  let size = null;
  let bold = null;
  for (let el = node.parentElement; el && el !== stop.parentElement; el = el.parentElement) {
    if (size === null) {
      size = toPx(styleValue(el, 'font-size'));
      if (size === null && el.tagName === 'FONT' && el.getAttribute('size')) {
        size = FONT_TAG_SIZES[el.getAttribute('size')] || null;
      }
    }
    if (bold === null) {
      const weight = styleValue(el, 'font-weight');
      if (weight) bold = weight === 'bold' || weight === 'bolder' || parseInt(weight, 10) >= 600;
      else if (['B', 'STRONG', 'TH', ...HEADING_TAGS].includes(el.tagName)) bold = true;
    }
    if (size !== null && bold !== null) break;
  }
  return { size, bold: !!bold };
}

/** Share of an element's characters that are bold, and the size most of its text uses. */
function measure(el) {
  let chars = 0;
  let boldChars = 0;
  const sizes = new Map();
  for (const node of textNodes(el)) {
    const n = node.data.replace(/\s/g, '').length;
    if (!n) continue;
    const { size, bold } = textStyle(node, el);
    chars += n;
    if (bold) boldChars += n;
    const key = size === null ? 'none' : String(Math.round(size));
    sizes.set(key, (sizes.get(key) || 0) + n);
  }
  let size = null;
  let best = 0;
  for (const [key, n] of sizes) {
    if (n > best) {
      best = n;
      size = key === 'none' ? null : Number(key);
    }
  }
  return { chars, boldShare: chars ? boldChars / chars : 0, size };
}

/** The size most body text uses (text with no size counts as 16px). */
function bodySize(blocks) {
  const sizes = new Map();
  for (const el of blocks) {
    for (const node of textNodes(el)) {
      const n = node.data.replace(/\s/g, '').length;
      if (!n) continue;
      const size = Math.round(textStyle(node, el).size ?? 16);
      sizes.set(size, (sizes.get(size) || 0) + n);
    }
  }
  let body = 16;
  let best = 0;
  for (const [size, n] of sizes) {
    if (n > best) {
      best = n;
      body = size;
    }
  }
  return body;
}

// ---------- 3. headings ----------

const TIME_OR_DATE = /\b\d{1,2}(:\d{2})?\s*([ap]\.?m\.?)(\W|$)|\b\d{1,2}:\d{2}\b|\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/i;
const LIST_MARKER = /^([•◦▪▫●○■□‣⁃·§–\-*]|\d{1,3}[.)]|[a-zA-Z][.)])\s+/;

// Text that is only styled to look like a heading (bigger or bold) becomes a real
// heading, which is what screen-reader users navigate by. Sizes are compared with
// the paste's own body text size, so it works whatever font size the source used.
function detectHeadings({ body, log }) {
  const blocks = [...body.children].filter((el) => !HEADING_TAGS.includes(el.tagName));
  const base = bodySize(blocks);
  const candidates = [];

  for (const p of body.children) {
    if (p.tagName !== 'P' || hasImage(p)) continue;
    const text = textOf(p);
    if (text.length === 0 || text.length > 120) continue;
    if (/^[a-z]/.test(text) || /[,;]$/.test(text)) continue;
    const m = measure(p);
    const size = m.size ?? 16;
    const ratio = size / base;
    if (ratio >= 1.2) {
      candidates.push({ p, text, size, sized: true });
    } else if (
      m.boldShare >= 0.95 &&
      Math.abs(ratio - 1) < 0.2 &&
      text.length <= 80 &&
      !/[.:]$/.test(text) &&
      !LIST_MARKER.test(text) &&
      !TIME_OR_DATE.test(text) && // "Due Friday at 11:59pm" is emphasis, not a section
      p.nextElementSibling // a heading introduces something
    ) {
      candidates.push({ p, text, size, sized: false });
    }
  }
  if (!candidates.length) return;

  // Group the sizes into levels: the largest size is the top level (H2), and so on.
  const sizes = [...new Set(candidates.filter((c) => c.sized).map((c) => c.size))].sort((a, b) => b - a);
  const tiers = [];
  for (const size of sizes) {
    const tier = tiers.find((t) => Math.abs(t - size) <= 1.5);
    if (tier === undefined) tiers.push(size);
  }
  const tierOf = (c) => {
    if (!c.sized) return tiers.length; // bold, body-size text is the lowest level
    return tiers.findIndex((t) => Math.abs(t - c.size) <= 1.5);
  };

  for (const c of candidates) {
    const level = Math.min(6, 2 + tierOf(c));
    const heading = rename(c.p, `h${level}`);
    log.add({
      status: 'fixed',
      kind: 'heading',
      title: `Made a heading (H${level})`,
      detail: `${quote(c.text)} was ${c.sized ? 'large' : 'bold'} text; it is now a real heading screen readers can jump to.`,
      target: heading,
    });
  }
}

// Heading levels must not skip (H2 straight to H4). The page or document title is
// H1, so content starts at H2 unless the paste already has an H1.
function fixHeadingLevels({ body, log }) {
  const headings = [...body.querySelectorAll('h1, h2, h3, h4, h5, h6')];
  let prev = headings.some((h) => h.tagName === 'H1') ? 0 : 1;
  for (let h of headings) {
    const level = Number(h.tagName[1]);
    if (level > prev + 1) {
      const fixed = prev + 1;
      h = rename(h, `h${fixed}`);
      const existing = h.getAttribute('data-change');
      const detail = `${quote(textOf(h))} went from H${level} to H${fixed} so no heading level is skipped.`;
      if (existing) {
        const item = log.items.find((i) => i.id === existing);
        item.title = `Made a heading (H${fixed})`;
      } else {
        log.add({ status: 'fixed', kind: 'heading', title: `Changed heading level to H${fixed}`, detail, target: h });
      }
      prev = fixed;
    } else {
      prev = level;
    }
  }
}

// ---------- 4. lists ----------

const STRONG_BULLET = /^[•◦▪▫●○■□‣⁃·§–]\s+/;
const WEAK_BULLET = /^[-*]\s+/;
const NUMBERED = /^(\d{1,3})[.)]\s+/;
const LETTERED = /^([a-zA-Z])[.)]\s+/;

function listMarker(text) {
  let m;
  if ((m = text.match(STRONG_BULLET))) return { kind: 'bullet', strong: true, length: m[0].length };
  if ((m = text.match(WEAK_BULLET))) return { kind: 'bullet', strong: false, length: m[0].length };
  if ((m = text.match(NUMBERED))) return { kind: 'number', value: Number(m[1]), length: m[0].length };
  if ((m = text.match(LETTERED))) {
    const ch = m[1];
    return { kind: ch === ch.toLowerCase() ? 'lower' : 'upper', value: ch.toLowerCase().charCodeAt(0) - 96, length: m[0].length };
  }
  return null;
}

/** Deletes the first `count` characters of an element's text, across nested elements. */
function dropLeadingChars(el, count) {
  for (const node of textNodes(el)) {
    if (count <= 0) break;
    const take = Math.min(count, node.data.length);
    node.data = node.data.slice(take);
    count -= take;
  }
}

// Lines that start with "•", "1." or "a)" become real lists. Numbers and letters only
// count when two or more lines in a row count up (1, 2, 3 or a, b, c), so a sentence
// such as "A. Smith argues…" is left alone.
function detectLists({ body, doc, log }) {
  const blocks = [...body.children];
  let i = 0;
  while (i < blocks.length) {
    const first = blocks[i];
    const firstMarker = first.tagName === 'P' ? listMarker(textOf(first)) : null;
    if (!firstMarker) {
      i++;
      continue;
    }
    const run = [{ el: first, marker: firstMarker }];
    for (let j = i + 1; j < blocks.length; j++) {
      const el = blocks[j];
      if (el.tagName !== 'P') break;
      const marker = listMarker(textOf(el));
      if (!marker || marker.kind !== firstMarker.kind) break;
      const prev = run[run.length - 1].marker;
      if (marker.kind !== 'bullet' && marker.value !== prev.value + 1) break;
      run.push({ el, marker });
    }

    const ok = firstMarker.kind === 'bullet' ? firstMarker.strong || run.length >= 2 : run.length >= 2;
    if (!ok) {
      i++;
      continue;
    }

    const ordered = firstMarker.kind !== 'bullet';
    const list = doc.createElement(ordered ? 'ol' : 'ul');
    if (ordered && firstMarker.value !== 1) list.setAttribute('start', String(firstMarker.value));
    if (firstMarker.kind === 'lower') list.setAttribute('type', 'a');
    if (firstMarker.kind === 'upper') list.setAttribute('type', 'A');
    first.before(list);
    for (const { el, marker } of run) {
      const leading = el.textContent.length - el.textContent.trimStart().length;
      dropLeadingChars(el, leading + marker.length);
      const li = rename(el, 'li');
      list.appendChild(li);
    }
    log.add({
      status: 'fixed',
      kind: 'list',
      title: ordered ? 'Made a numbered list' : 'Made a bulleted list',
      detail: `${run.length} lines typed as a list are now a real list, so screen readers announce how many items it has.`,
      target: list,
    });
    i += run.length;
  }
}

// ---------- 5. tables ----------

function looksLikeHeaderRow(row) {
  const cells = [...row.cells];
  if (!cells.length || cells.some((c) => textOf(c) === '')) return false;
  const allBold = cells.every((c) => measure(c).boldShare >= 0.95);
  const shaded = (el) => {
    const bg = styleValue(el, 'background-color') || styleValue(el, 'background') || (el.getAttribute('bgcolor') || '').toLowerCase();
    if (!bg) return false;
    const color = parseColor(bg);
    return color ? !(color.r > 245 && color.g > 245 && color.b > 245) : bg !== 'transparent';
  };
  const allShaded = shaded(row) || cells.every(shaded);
  return allBold || allShaded;
}

// Tables need header cells so screen readers can say which column a value is in.
// The first row is only turned into headers automatically when it is styled like
// one (bold or shaded); otherwise the table is listed for review with a button.
function fixTables({ body, log }) {
  for (const table of body.querySelectorAll('table')) {
    const rows = [...table.rows];
    const width = Math.max(0, ...rows.map((r) => r.cells.length));
    if (rows.length < 2 || width < 2) continue; // a layout table, not data
    if (table.querySelector('th')) {
      table.querySelectorAll('th').forEach((th) => {
        if (!th.getAttribute('scope')) th.setAttribute('scope', th.parentElement === rows[0] ? 'col' : 'row');
      });
      continue;
    }
    if (looksLikeHeaderRow(rows[0])) {
      makeHeaderRow(table);
      log.add({
        status: 'fixed',
        kind: 'table',
        title: 'Added table headers',
        detail: 'The first row was styled as a header, so it is now marked as one.',
        target: table,
      });
    } else {
      log.add({
        status: 'review',
        kind: 'table',
        title: 'Table has no header row',
        detail: 'If the first row names the columns, mark it as the header.',
        target: table,
        action: 'table-header',
      });
    }
  }
}

/** Turns a table's first row into header cells. Also used by the review panel. */
export function makeHeaderRow(table) {
  const row = table.rows[0];
  for (const td of [...row.cells]) {
    if (td.tagName === 'TH') continue;
    const th = rename(td, 'th');
    th.setAttribute('scope', 'col');
  }
}

// ---------- 6. colors, underlines, bold and italic ----------

// Colored text is kept (it usually means something, like red for warnings) but
// listed, because color alone can't carry meaning and light colors are hard to read.
// Black, gray and white text (often left over from dark mode) go back to normal.
function keepMeaningfulColors({ body, log }) {
  const groups = new Map();
  for (const el of body.querySelectorAll('[style], font[color]')) {
    if (el.closest('a')) continue;
    const value = styleValue(el, 'color') || (el.getAttribute('color') || '').toLowerCase();
    if (!value) continue;
    const color = parseColor(value);
    if (!color || isNeutral(color) || textOf(el) === '') continue;
    el.setAttribute('data-keep-color', color.hex);
    if (!groups.has(color.hex)) groups.set(color.hex, { color, elements: [] });
    groups.get(color.hex).elements.push(el);
  }

  for (const { color, elements } of groups.values()) {
    const ratio = contrastWithWhite(color);
    const places = elements.length === 1 ? '1 place' : `${elements.length} places`;
    const sample = quote(textOf(elements[0]), 30);
    if (ratio < 4.5) {
      log.add({
        status: 'review',
        kind: 'color',
        title: `Hard-to-read color ${color.hex}`,
        detail: `Used in ${places} (${sample}). Contrast on white is ${ratio.toFixed(1)}:1; it needs 4.5:1. Pick a darker shade, or remove it.`,
        target: elements[0],
        action: 'remove-color',
      });
    } else {
      log.add({
        status: 'review',
        kind: 'color',
        title: `Colored text kept (${color.hex})`,
        detail: `Used in ${places} (${sample}). Make sure the color isn't the only thing showing what it means (add a word like “Important:”).`,
        target: elements[0],
        action: 'remove-color',
      });
    }
  }
}

/** Removes a kept color everywhere it is used. Used by the review panel. */
export function removeColor(root, hex) {
  root.querySelectorAll(`[data-keep-color="${hex}"]`).forEach((el) => {
    el.removeAttribute('data-keep-color');
    el.style.removeProperty('color');
    if (!el.getAttribute('style')) el.removeAttribute('style');
    if (el.tagName === 'SPAN' && !el.hasAttribute('data-change') && el.attributes.length === 0) unwrap(el);
  });
}

// Underlined text that isn't a link looks like a link.
function removeUnderlines({ body, log }) {
  let count = 0;
  for (const u of [...body.querySelectorAll('u')]) {
    if (u.closest('a')) continue;
    unwrap(u);
    count++;
  }
  for (const el of body.querySelectorAll('[style]')) {
    if (el.closest('a')) continue;
    const deco = styleValue(el, 'text-decoration') || styleValue(el, 'text-decoration-line');
    if (deco.includes('underline')) {
      el.style.removeProperty('text-decoration');
      el.style.removeProperty('text-decoration-line');
      count++;
    }
  }
  if (count) {
    log.add({
      status: 'fixed',
      kind: 'underline',
      title: count === 1 ? 'Removed 1 underline' : `Removed ${count} underlines`,
      detail: 'Underlined text that isn’t a link looks like a link. Use bold or italics for emphasis instead.',
    });
  }
}

// Bold and italics set with styles become <strong> and <em>, which survive the
// style cleanup. Inside headings bold is dropped (headings are bold already).
function convertInlineStyles({ body, doc }) {
  for (const el of [...body.querySelectorAll('[style]')]) {
    if (HEADING_TAGS.includes(el.tagName) || el.closest('h1, h2, h3, h4, h5, h6, th')) continue;
    const weight = styleValue(el, 'font-weight');
    const italic = styleValue(el, 'font-style') === 'italic';
    const bold = weight === 'bold' || weight === 'bolder' || parseInt(weight, 10) >= 600;
    const wraps = [];
    if (bold && !['B', 'STRONG'].includes(el.tagName)) wraps.push('strong');
    if (italic && !['I', 'EM'].includes(el.tagName)) wraps.push('em');
    for (const tag of wraps) {
      const wrapper = doc.createElement(tag);
      while (el.firstChild) wrapper.appendChild(el.firstChild);
      el.appendChild(wrapper);
    }
  }
  for (const b of [...body.querySelectorAll('b')]) rename(b, 'strong');
  for (const i of [...body.querySelectorAll('i')]) rename(i, 'em');
  for (const el of [...body.querySelectorAll('h1 strong, h2 strong, h3 strong, h4 strong, h5 strong, h6 strong, th strong')]) {
    unwrap(el);
  }
  // <strong><strong>x</strong></strong> → <strong>x</strong>
  for (const el of [...body.querySelectorAll('strong strong, em em')]) unwrap(el);
}

const KEEP_ATTRS = {
  A: ['href'],
  IMG: ['src', 'alt'],
  TD: ['colspan', 'rowspan'],
  TH: ['colspan', 'rowspan', 'scope'],
  OL: ['start', 'type'],
};

function stripAttributes({ body }) {
  for (let el of [...body.querySelectorAll('*')]) {
    const keep = KEEP_ATTRS[el.tagName] || [];
    const color = el.getAttribute('data-keep-color');
    for (const attr of [...el.attributes]) {
      if (keep.includes(attr.name) || attr.name === 'data-change' || attr.name === 'data-keep-color') continue;
      el.removeAttribute(attr.name);
    }
    if (color) el.setAttribute('style', `color: ${color};`);
    if (el.tagName === 'FONT') {
      el = rename(el, 'span');
    }
    if (el.tagName === 'SPAN' && el.attributes.length === 0) unwrap(el);
  }
}

// ---------- 7. links ----------

const VAGUE_LINK = /^(click here|click|here|this|this link|link|read more|more|more info|more information|info|details|learn more|see more|see here|check it out|go|website|this website|page|this page)$/i;
const URL_TEXT = /^(https?:\/\/|www\.)\S+$/i;

// Link text has to say where the link goes; screen-reader users often browse a
// list of just the links. "click here" is rewritten when the address has a readable
// name (like /pages/week-1-overview); otherwise it is marked for a person to fill in.
function fixLinks({ body, log }) {
  for (const a of [...body.querySelectorAll('a')]) {
    const href = a.getAttribute('href');
    const text = textOf(a);
    if (!href) {
      unwrap(a);
      continue;
    }
    if (text === '' && !hasImage(a)) {
      a.remove();
      continue;
    }
    const bare = text.replace(/[.!:]+$/, '');
    const info = describeUrl(href);
    if (VAGUE_LINK.test(bare)) {
      if (info.readable) {
        a.textContent = info.label;
        log.add({
          status: 'fixed',
          kind: 'link',
          title: 'Rewrote vague link text',
          detail: `${quote(text)} now says ${quote(info.label, 60)}. Edit it below if it should say something else.`,
          target: a,
          action: 'link-text',
        });
      } else {
        log.add({
          status: 'review',
          kind: 'link',
          title: 'Link text needs a description',
          detail: `${quote(text)} links to a ${info.type}, but its address doesn't say what it is. Type what the link opens.`,
          target: a,
          action: 'link-text',
        });
      }
    } else if (URL_TEXT.test(text) && text.length > 30) {
      log.add({
        status: 'review',
        kind: 'link',
        title: 'Link text is a web address',
        detail: `Screen readers read the whole address out loud.${info.readable ? ` Suggested: ${quote(info.label, 60)}.` : ''} Keep it only if people need to see the address (for example, on a printout).`,
        target: a,
        action: 'link-text',
      });
    }
  }
}

// ---------- 8. images ----------

const UNHELPFUL_ALT = /(\.(png|jpe?g|gif|webp|svg|bmp|heic)$)|(^(image|img|picture|pic|photo|graphic|screenshot|screen shot|untitled)[\s_-]*\d*$)|(^(img|dsc|pxl)[\s_-]?\d+)/i;

function checkImages({ body, log }) {
  for (const img of body.querySelectorAll('img')) {
    const alt = img.getAttribute('alt');
    if (alt === null) {
      log.add({
        status: 'review',
        kind: 'image',
        title: 'Image needs a description',
        detail: 'Describe what the image shows, or mark it decorative if it adds nothing.',
        target: img,
        action: 'alt-text',
      });
    } else if (alt.trim() === '') {
      log.add({
        status: 'info',
        kind: 'image',
        title: 'Image marked decorative',
        detail: 'Screen readers skip it. Add a description if it carries information.',
        target: img,
        action: 'alt-text',
      });
    } else if (UNHELPFUL_ALT.test(alt.trim())) {
      log.add({
        status: 'review',
        kind: 'image',
        title: 'Image description is a file name',
        detail: `${quote(alt)} doesn't describe the image.`,
        target: img,
        action: 'alt-text',
      });
    }
  }
}

// ---------- 9. emoji and whitespace ----------

const EMOJI = /[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}\u{1F1E6}-\u{1F1FF}]|️|‍|⃣/gu;
const KEEP_SYMBOLS = new Set(['©', '®', '™']);

function removeEmoji({ body, log }) {
  let count = 0;
  for (const node of textNodes(body)) {
    const next = node.data.replace(EMOJI, (ch) => {
      if (KEEP_SYMBOLS.has(ch)) return ch;
      if (/\p{Extended_Pictographic}/u.test(ch)) count++;
      return ' ';
    });
    if (next !== node.data) node.data = next;
  }
  if (count) {
    log.add({
      status: 'fixed',
      kind: 'emoji',
      title: count === 1 ? 'Removed 1 emoji' : `Removed ${count} emoji`,
      detail: 'Screen readers read emoji names aloud (“party popper”). Turn this off under Options to keep them.',
    });
  }
}

function tidyWhitespace({ body }) {
  for (const node of textNodes(body)) node.data = node.data.replace(/\s+/g, ' ');
  for (const block of body.querySelectorAll('p, li, td, th, h1, h2, h3, h4, h5, h6, caption')) {
    const nodes = textNodes(block);
    if (!nodes.length) continue;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    first.data = first.data.replace(/^\s+/, '');
    last.data = last.data.replace(/\s+$/, '');
    // a space at the end of one piece of text and the start of the next is one space
    for (let i = 1; i < nodes.length; i++) {
      if (/\s$/.test(nodes[i - 1].data) && /^\s/.test(nodes[i].data)) nodes[i].data = nodes[i].data.replace(/^\s+/, '');
    }
  }
  for (const el of [...body.querySelectorAll('strong, em, span, sub, sup, code')]) {
    if (el.textContent === '' && !hasImage(el)) el.remove();
  }
  // space before punctuation left by removed emoji: "Done !" → "Done!"
  for (const node of textNodes(body)) node.data = node.data.replace(/ ([.,!?;:])/g, '$1');
}

// ---------- 10. standard formatting ----------

// Inline styles, because Google Docs keeps inline styles when pasting.
const TYPOGRAPHY = {
  base: 'font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.5; color: #202124;',
  P: 'margin: 0 0 12pt 0;',
  H1: 'font-size: 20pt; font-weight: bold; margin: 20pt 0 6pt 0; color: #000000;',
  H2: 'font-size: 18pt; font-weight: bold; margin: 18pt 0 6pt 0; color: #000000;',
  H3: 'font-size: 14pt; font-weight: bold; margin: 14pt 0 4pt 0; color: #202124;',
  H4: 'font-size: 12pt; font-weight: bold; margin: 12pt 0 4pt 0; color: #202124;',
  H5: 'font-size: 12pt; font-weight: bold; font-style: italic; margin: 12pt 0 4pt 0; color: #202124;',
  H6: 'font-size: 12pt; font-style: italic; margin: 12pt 0 4pt 0; color: #202124;',
  UL: 'padding-left: 24pt; margin: 0 0 12pt 0;',
  OL: 'padding-left: 24pt; margin: 0 0 12pt 0;',
  LI: 'margin: 0 0 4pt 0;',
  TABLE: 'border-collapse: collapse; margin: 0 0 12pt 0;',
  TH: 'background-color: #f1f3f4; font-weight: bold; text-align: left; padding: 6pt; border: 1px solid #dadce0;',
  TD: 'padding: 6pt; border: 1px solid #dadce0;',
};

/** Joins style strings; a property set later replaces the same property set earlier. */
function mergeStyles(...styles) {
  const props = new Map();
  for (const style of styles) {
    for (const decl of style.split(';')) {
      const i = decl.indexOf(':');
      if (i > 0) props.set(decl.slice(0, i).trim(), decl.slice(i + 1).trim());
    }
  }
  return [...props].map(([k, v]) => `${k}: ${v};`).join(' ');
}

function applyStandardFormatting({ body }) {
  for (const el of body.querySelectorAll('p, h1, h2, h3, h4, h5, h6, ul, ol, li, table, th, td')) {
    const own = TYPOGRAPHY[el.tagName] || '';
    const base = ['UL', 'OL', 'TABLE'].includes(el.tagName) ? '' : TYPOGRAPHY.base;
    const keep = el.getAttribute('data-keep-color') ? `color: ${el.getAttribute('data-keep-color')};` : '';
    el.setAttribute('style', mergeStyles(base, own, keep));
  }
  for (const ol of body.querySelectorAll('ol[type]')) {
    const type = ol.getAttribute('type') === 'A' ? 'upper-alpha' : 'lower-alpha';
    ol.setAttribute('style', mergeStyles(ol.getAttribute('style') || '', `list-style-type: ${type};`));
  }
}
