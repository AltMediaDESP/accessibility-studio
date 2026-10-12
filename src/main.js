import { cleanHtml, textToHtml, stripMarks, makeHeaderRow, removeColor } from './lib/clean.js';
import * as mla from './lib/mla.js';
import * as apa from './lib/apa.js';
import { MONTHS } from './lib/cite-common.js';
import { sampleHtml } from './sample.js';

import '@fontsource/archivo/latin-400.css';
import '@fontsource/archivo/latin-600.css';
import '@fontsource/archivo/latin-800.css';
import './styles.css';

const $ = (id) => document.getElementById(id);

// ---------- tabs ----------

const tabs = [...document.querySelectorAll('[role="tab"]')];
function selectTab(tab) {
  for (const t of tabs) {
    const selected = t === tab;
    t.setAttribute('aria-selected', String(selected));
    t.tabIndex = selected ? 0 : -1;
    $(t.getAttribute('aria-controls')).hidden = !selected;
  }
  tab.focus();
  try {
    localStorage.setItem('tab', tab.id);
  } catch {
    // storage blocked; the page works without it
  }
}
tabs.forEach((tab, i) => {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      selectTab(next);
      e.preventDefault();
    }
  });
});
try {
  const saved = localStorage.getItem('tab');
  if (saved && $(saved)) {
    selectTab($(saved));
    document.activeElement.blur();
  }
} catch {
  // ignore
}

// ---------- clean up a paste ----------

const state = { source: '', changes: [] };

$('paste').addEventListener('paste', (e) => {
  e.preventDefault();
  const html = e.clipboardData.getData('text/html');
  const text = e.clipboardData.getData('text/plain');
  if (!html && !text.trim()) return;
  state.source = html || textToHtml(text);
  run();
  $('editor').focus();
});

// Typing or dropping into the paste box instead of pasting still works.
$('paste').addEventListener('input', () => {
  const box = $('paste');
  if (box.textContent.trim() === '' && !box.querySelector('img')) return;
  state.source = box.innerHTML;
  box.innerHTML = '';
  run();
});

$('sample').addEventListener('click', () => {
  state.source = sampleHtml;
  run();
  setStatus('This is an example. Click Start over to paste your own content.');
  $('editor').focus();
});

function options() {
  return { removeEmoji: $('opt-emoji').checked, standardFormatting: $('opt-format').checked };
}

function run() {
  const { html, changes } = cleanHtml(state.source, window, options());
  state.changes = changes;
  $('editor').innerHTML = html;
  $('start').hidden = true;
  $('result').hidden = false;
  setStatus('');
  renderChanges();
}

for (const id of ['opt-emoji', 'opt-format']) {
  $(id).addEventListener('change', () => {
    if (state.source) {
      run();
      setStatus('Cleaned again with the new options. Edits you made by hand were replaced.');
    }
  });
}

$('restart').addEventListener('click', () => {
  state.source = '';
  state.changes = [];
  $('editor').innerHTML = '';
  $('result').hidden = true;
  $('start').hidden = false;
  $('paste').focus();
});

function setStatus(message) {
  $('status').textContent = message;
}

// ---------- the review list ----------

const GROUPS = [
  ['review', 'Needs you'],
  ['info', 'Good to know'],
  ['fixed', 'Fixed automatically'],
];

function renderChanges() {
  const list = $('changes');
  list.innerHTML = '';
  renderSummary();

  for (const [status, heading] of GROUPS) {
    const items = state.changes.filter((c) => c.status === status);
    if (!items.length) continue;
    const groupHeading = document.createElement('li');
    groupHeading.className = 'group';
    groupHeading.innerHTML = `<h3>${heading} <span class="count">${items.length}</span></h3>`;
    list.appendChild(groupHeading);
    for (const change of items) list.appendChild(renderChange(change));
  }
  markOpenItems();
}

// "2 need you · 9 fixed" as colored pills, or a note when there was nothing to do.
function renderSummary() {
  const summary = $('summary');
  const open = state.changes.filter((c) => c.status === 'review').length;
  const fixed = state.changes.filter((c) => c.status === 'fixed' || c.status === 'done').length;
  if (state.changes.length === 0) {
    summary.textContent = 'Nothing needed fixing.';
    return;
  }
  summary.innerHTML = '';
  const pill = (kind, text) => {
    const span = document.createElement('span');
    span.className = `pill ${kind}`;
    span.textContent = text;
    summary.appendChild(span);
  };
  pill(open ? 'review' : 'fixed', open ? `${open} ${open === 1 ? 'needs' : 'need'} you` : 'All done');
  pill('fixed', `${fixed} fixed`);
}

function target(change) {
  return $('editor').querySelector(`[data-change="${change.id}"]`);
}

function renderChange(change) {
  const li = document.createElement('li');
  li.className = `change ${change.status}`;
  li.dataset.id = change.id;

  const head = document.createElement(target(change) ? 'button' : 'div');
  head.className = 'change-head';
  head.innerHTML = `<span class="change-title"></span><span class="change-detail"></span>`;
  head.querySelector('.change-title').textContent = change.title;
  head.querySelector('.change-detail').textContent = change.detail;
  if (head.tagName === 'BUTTON') {
    head.type = 'button';
    head.title = 'Show in the text';
    head.addEventListener('click', () => flash(change));
  }
  li.appendChild(head);

  const action = renderAction(change);
  if (action) li.appendChild(action);
  return li;
}

function renderAction(change) {
  const el = target(change);
  if (!el || !change.action) return null;
  const box = document.createElement('div');
  box.className = 'change-action';
  const inputId = `input-${change.id}`;

  if (change.action === 'alt-text') {
    box.innerHTML = `
      <label for="${inputId}">Image description</label>
      <textarea id="${inputId}" rows="2" placeholder="What does the image show?"></textarea>
      <div class="row"><button type="button" class="save">Save</button><button type="button" class="decorative">Decorative</button></div>`;
    const input = box.querySelector('textarea');
    input.value = el.getAttribute('alt') || '';
    box.querySelector('.save').addEventListener('click', () => {
      if (!input.value.trim()) return input.focus();
      el.setAttribute('alt', input.value.trim());
      resolve(change, 'Description saved.');
    });
    box.querySelector('.decorative').addEventListener('click', () => {
      el.setAttribute('alt', '');
      input.value = '';
      resolve(change, 'Marked decorative; screen readers will skip it.');
    });
  }

  if (change.action === 'link-text') {
    box.innerHTML = `
      <label for="${inputId}">Link text</label>
      <input id="${inputId}" />
      <div class="row"><button type="button" class="save">Save</button><a class="open" target="_blank" rel="noopener">Open link</a></div>`;
    const input = box.querySelector('input');
    input.value = el.textContent;
    box.querySelector('.open').href = el.getAttribute('href');
    const save = () => {
      if (!input.value.trim()) return input.focus();
      el.textContent = input.value.trim();
      resolve(change, 'Link text saved.');
    };
    box.querySelector('.save').addEventListener('click', save);
    input.addEventListener('keydown', (e) => e.key === 'Enter' && save());
  }

  if (change.action === 'table-header') {
    box.innerHTML = `<div class="row"><button type="button">Use the first row as the header</button></div>`;
    box.querySelector('button').addEventListener('click', () => {
      makeHeaderRow(el.closest('table') || el);
      if (options().standardFormatting) {
        el.querySelectorAll('th').forEach((th) =>
          th.setAttribute('style', 'font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.5; color: #202124; background-color: #f1f3f4; font-weight: bold; text-align: left; padding: 6pt; border: 1px solid #dadce0;'),
        );
      }
      resolve(change, 'The first row is now the header.');
      box.remove();
    });
  }

  if (change.action === 'remove-color') {
    const hex = el.getAttribute('data-keep-color');
    box.innerHTML = `<div class="row"><span class="swatch" style="background:${hex}"></span><button type="button">Remove this color everywhere</button></div>`;
    box.querySelector('button').addEventListener('click', () => {
      removeColor($('editor'), hex);
      if (options().standardFormatting) {
        // removing the color also removed the standard color on paragraphs; put it back
        $('editor').querySelectorAll('p, li, td, th, h3, h4, h5, h6').forEach((block) => {
          if (!/color:/.test(block.getAttribute('style') || '')) block.style.color = '#202124';
        });
      }
      resolve(change, 'Color removed.');
      box.remove();
    });
  }
  return box;
}

function resolve(change, message) {
  change.status = 'done';
  const li = $('changes').querySelector(`[data-id="${change.id}"]`);
  li.classList.add('done');
  setStatus(message);
  renderSummary();
  markOpenItems();
}

// Things that still need a person get a dashed outline in the text.
function markOpenItems() {
  const editor = $('editor');
  editor.querySelectorAll('[data-open]').forEach((el) => el.removeAttribute('data-open'));
  for (const change of state.changes) {
    if (change.status !== 'review') continue;
    target(change)?.setAttribute('data-open', '');
  }
}

function flash(change) {
  const el = target(change);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.setAttribute('data-flash', '');
  setTimeout(() => el.removeAttribute('data-flash'), 1600);
}

// ---------- copying ----------

$('copy').addEventListener('click', async () => {
  const clone = $('editor').cloneNode(true);
  stripMarks(clone);
  clone.querySelectorAll('[data-open]').forEach((el) => el.removeAttribute('data-open'));
  const ok = await copyRich(clone.innerHTML, plainText(clone));
  const open = state.changes.filter((c) => c.status === 'review').length;
  if (!ok) {
    setStatus('Copying was blocked by the browser. Select the cleaned text, then press Ctrl+C.');
  } else if (open) {
    setStatus(`Copied. ${open} ${open === 1 ? 'item still needs' : 'items still need'} you; you can fix ${open === 1 ? 'it' : 'them'} here or in Google Docs.`);
  } else {
    setStatus('Copied. Paste it into Google Docs with Ctrl+V.');
  }
});

function plainText(root) {
  const lines = [];
  for (const block of root.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, tr')) {
    if (block.tagName === 'TR') lines.push([...block.cells].map((c) => c.textContent.trim()).join('\t'));
    else if (!block.closest('li') || block.tagName === 'LI') lines.push((block.tagName === 'LI' ? '• ' : '') + block.textContent.trim());
  }
  return lines.join('\n');
}

async function copyRich(html, text) {
  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([text], { type: 'text/plain' }),
      }),
    ]);
    return true;
  } catch {
    // Older browsers: copy a selection of a hidden copy instead.
    const holder = document.createElement('div');
    holder.innerHTML = html;
    holder.style.cssText = 'position:fixed;left:-9999px;top:0;background:#fff;color:#000;';
    document.body.appendChild(holder);
    const range = document.createRange();
    range.selectNodeContents(holder);
    const selection = getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    selection.removeAllRanges();
    holder.remove();
    return ok;
  }
}

// ---------- MLA ----------

const form = $('mla-form');
const authors = $('authors');

function addAuthor(first = '', last = '') {
  const n = authors.children.length + 1;
  const row = document.createElement('div');
  row.className = 'author';
  row.innerHTML = `
    <label class="field"><span>First name</span><input class="first" /></label>
    <label class="field"><span>Last name</span><input class="last" /></label>
    <button type="button" class="remove small-button" aria-label="Remove author ${n}">Remove</button>`;
  row.querySelector('.first').value = first;
  row.querySelector('.last').value = last;
  row.querySelector('.remove').addEventListener('click', () => {
    row.remove();
    if (!authors.children.length) addAuthor();
    updateCitation();
  });
  authors.appendChild(row);
  return row;
}
addAuthor();
$('add-author').addEventListener('click', () => addAuthor().querySelector('.first').focus());

const monthSelect = form.elements.month;
MONTHS.forEach((name, i) => monthSelect.add(new Option(name, String(i + 1))));

function readSource() {
  const data = new FormData(form);
  return {
    style: data.get('style'),
    kind: data.get('kind'),
    authors: [...authors.querySelectorAll('.author')].map((row) => ({
      first: row.querySelector('.first').value,
      last: row.querySelector('.last').value,
    })),
    title: data.get('title'),
    container: data.get('container'),
    volume: data.get('volume'),
    issue: data.get('issue'),
    publisher: data.get('publisher'),
    date: { year: data.get('year'), month: data.get('month'), day: data.get('day') },
    location: data.get('location'),
    accessed: data.get('accessed'),
    quote: data.get('quote'),
  };
}

let citation = { entry: null, intext: null };

function updateCitation() {
  const source = readSource();
  const whole = source.kind === 'whole';
  const isApa = source.style === 'apa';
  $('container-field').hidden = whole;
  $('volume-fields').hidden = whole;
  $('accessed-field').hidden = isApa; // APA only uses access dates for pages that change constantly
  $('apa-case').hidden = !isApa;
  $('title-label').textContent = whole ? 'Title of the book, report or website' : 'Title of the article, chapter or page';
  $('entry-label').textContent = isApa ? 'Reference list entry' : 'Works Cited entry';
  const style = isApa ? { entry: apa.reference, inText: apa.inText } : { entry: mla.worksCited, inText: mla.inText };
  const empty = !source.title?.trim() && source.authors.every((a) => !a.first.trim() && !a.last.trim());
  citation = { entry: style.entry(source), intext: style.inText(source, source.quote) };
  $('mla-entry').innerHTML = empty ? '<span class="muted">Your entry appears here.</span>' : citation.entry.html;
  $('mla-intext').innerHTML = empty ? '<span class="muted">Your in-text citation appears here.</span>' : citation.intext.html;
  try {
    localStorage.setItem('citation-style', source.style);
  } catch {
    // ignore
  }
}
form.addEventListener('input', updateCitation);
document.querySelectorAll('input[name="style"]').forEach((r) => r.addEventListener('change', updateCitation));
form.addEventListener('submit', (e) => e.preventDefault());
try {
  const saved = localStorage.getItem('citation-style');
  const radio = saved && document.querySelector(`input[name="style"][value="${saved}"]`);
  if (radio) radio.checked = true;
} catch {
  // ignore
}
updateCitation();

for (const button of document.querySelectorAll('.copy-citation')) {
  button.addEventListener('click', async () => {
    const c = citation[button.dataset.target];
    const html =
      button.dataset.target === 'entry'
        ? `<p style="font-family: Arial, sans-serif; font-size: 12pt; line-height: 2; margin-left: 0.5in; text-indent: -0.5in;">${c.html}</p>`
        : `<span>${c.html}</span>`;
    const ok = await copyRich(html, c.text);
    $('mla-status').textContent = ok ? 'Copied, with italics. Paste it into your document.' : 'Copying was blocked; select the text and press Ctrl+C.';
  });
}
