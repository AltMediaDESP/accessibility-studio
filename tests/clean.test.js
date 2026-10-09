import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

import { cleanHtml, textToHtml, makeHeaderRow, removeColor, stripMarks } from '../src/lib/clean.js';
import { canvasPage, wordDoc, googleDoc, powerPoint } from './fixtures.js';

const { window } = new JSDOM('<!doctype html><html><body></body></html>');

/** Cleans without the standard formatting, and returns a parsed body to inspect. */
function clean(html, options = {}) {
  const result = cleanHtml(html, window, { standardFormatting: false, ...options });
  const body = new window.DOMParser().parseFromString(`<body>${result.html}</body>`, 'text/html').body;
  return { ...result, body };
}

const texts = (body, selector) => [...body.querySelectorAll(selector)].map((el) => el.textContent.trim());
const titles = (changes, status) => changes.filter((c) => !status || c.status === status).map((c) => c.title);

// ---------- the bugs found in the old Accessibility Studio ----------

test('ordinary paragraphs starting with "The", "In", "A" are never merged together', () => {
  const { body } = clean('<p>Week 1 overview.</p><p>The essay is due Friday.</p><p>In class we will discuss it.</p><p>a lowercase start stays too.</p>');
  assert.deepEqual(texts(body, 'p'), ['Week 1 overview.', 'The essay is due Friday.', 'In class we will discuss it.', 'a lowercase start stays too.']);
});

test('a single line starting with "A." is not turned into a list', () => {
  const { body } = clean('<p>A. Smith argues this point well.</p><p>Next paragraph.</p>');
  assert.equal(body.querySelector('ol'), null);
  assert.equal(texts(body, 'p')[0], 'A. Smith argues this point well.');
});

test('a "click here" link to a Google Doc is flagged, not given the document ID as text', () => {
  const { body, changes } = clean('<p>See the syllabus <a href="https://docs.google.com/document/d/1AbCdEfGhIjKlMnOp/edit">click here</a>.</p>');
  assert.equal(body.querySelector('a').textContent, 'click here');
  const item = changes.find((c) => c.kind === 'link');
  assert.equal(item.status, 'review');
  assert.match(item.detail, /Google Doc/);
});

test('an image with no alt text is flagged and no placeholder text is invented', () => {
  const { body, changes } = clean('<p><img src="https://example.com/chart.png"></p>');
  assert.equal(body.querySelector('img').hasAttribute('alt'), false);
  assert.deepEqual(titles(changes, 'review'), ['Image needs a description']);
});

test('a table whose first row is plain data is flagged instead of getting headers', () => {
  const { body, changes } = clean('<table><tr><td>Mon</td><td>Quiz</td></tr><tr><td>Tue</td><td>Lab</td></tr></table>');
  assert.equal(body.querySelector('th'), null);
  assert.equal(changes.find((c) => c.kind === 'table').status, 'review');
});

test('javascript: links are removed', () => {
  const { body } = clean('<p><a href="javascript:alert(1)">Open</a> and <a href="https://example.com/a" onclick="x()">safe</a></p>');
  const links = [...body.querySelectorAll('a')];
  assert.equal(links.length, 1);
  assert.equal(links[0].getAttribute('href'), 'https://example.com/a');
  assert.equal(links[0].hasAttribute('onclick'), false);
});

// ---------- full pastes ----------

test('Canvas page', () => {
  const { body, changes } = clean(canvasPage);
  assert.deepEqual(texts(body, 'h2'), ['Week 3: Research Skills']);
  assert.deepEqual(texts(body, 'h3'), ['Readings']);
  // the split due date is joined, and nothing else is merged
  assert.ok(texts(body, 'p').includes('Due Friday at 11:59pm'));
  assert.ok(texts(body, 'p').includes('The first reading is short. In class we will compare notes.'));
  // readable Canvas page link rewritten, numeric assignment link flagged
  const links = [...body.querySelectorAll('a')].map((a) => a.textContent);
  assert.deepEqual(links, ['Library Research Guide (Canvas Page)', 'click here']);
  // emoji removed, no empty paragraphs, red kept, Canvas's dark gray dropped
  assert.doesNotMatch(body.textContent, /📚|🎉/);
  assert.equal([...body.querySelectorAll('p')].filter((p) => p.textContent.trim() === '' && !p.querySelector('img')).length, 0);
  assert.equal(body.querySelector('[style*="color"]').textContent, 'Late work is not accepted.');
  assert.equal(body.querySelectorAll('[style]').length, 1);

  assert.deepEqual(titles(changes, 'review').sort(), [
    'Hard-to-read color #e03e2d', // Canvas's own red is 4.3:1 on white
    'Image needs a description',
    'Link text needs a description',
  ]);
  assert.ok(titles(changes, 'fixed').includes('Joined a split line'));
  assert.ok(titles(changes, 'fixed').includes('Rewrote vague link text'));
});

test('Word document', () => {
  const { body, changes } = clean(wordDoc);
  assert.deepEqual(texts(body, 'h2'), ['Lab Safety']);
  assert.deepEqual(texts(body, 'ul > li'), ['Wear goggles', 'Tie back long hair']);
  assert.equal(body.querySelector('u'), null);
  assert.ok(texts(body, 'p').includes('Never eat in the lab.'));
  assert.ok(titles(changes).includes('Removed 1 underline'));
  // no Word leftovers
  assert.doesNotMatch(body.innerHTML, /Mso|mso-|o:p|class=/);
});

test('Google Docs document', () => {
  const { body, changes } = clean(googleDoc);
  // the font-weight:normal wrapper is not bold
  assert.equal(body.querySelector('strong > h2, strong > p'), null);
  assert.deepEqual(texts(body, 'strong'), ['three parts']);
  assert.deepEqual(texts(body, 'em'), [', weighted below']);
  assert.equal(texts(body, 'p')[0], 'Your grade has three parts, weighted below.');
  // bold first row becomes the header
  assert.deepEqual(texts(body, 'th'), ['Part', 'Weight']);
  assert.ok(titles(changes, 'fixed').includes('Added table headers'));
  // H4 right after H2 is moved up to H3
  assert.deepEqual(texts(body, 'h3'), ['Extra credit']);
  // list items lose their inner <p>
  assert.equal(body.querySelector('li p'), null);
  assert.deepEqual(texts(body, 'li'), ['Attend a lecture']);
});

test('PowerPoint slide', () => {
  const { body } = clean(powerPoint);
  assert.deepEqual(texts(body, 'h2'), ['Photosynthesis']);
  assert.deepEqual(texts(body, 'ul > li'), [
    'Plants turn light into energy',
    'It happens in the chloroplasts',
    'Oxygen is released',
  ]);
  assert.equal(body.querySelector('div'), null);
});

// ---------- individual rules ----------

test('headings are found relative to the paste’s own body text size', () => {
  // body text is 11pt here, so 14pt bold is a heading and 11pt is not
  const { body } = clean(
    '<p style="font-size:14pt"><b>Overview</b></p><p style="font-size:11pt">Body text one.</p><p style="font-size:11pt">Body text two.</p>',
  );
  assert.deepEqual(texts(body, 'h2'), ['Overview']);
});

test('two heading sizes become H2 and H3; short bold lines become the next level down', () => {
  const { body } = clean(
    '<p style="font-size:24px">Unit</p><p style="font-size:20px">Topic</p><p><b>Key terms</b></p><p>Body text that is long enough to be the body.</p>',
  );
  assert.deepEqual(texts(body, 'h2'), ['Unit']);
  assert.deepEqual(texts(body, 'h3'), ['Topic']);
  assert.deepEqual(texts(body, 'h4'), ['Key terms']);
});

test('bold sentences, bold labels ending in a colon and a bold last line are not headings', () => {
  const { body } = clean('<p><b>Read this carefully.</b></p><p><b>Due date:</b></p><p>Text</p><p><b>Good luck</b></p>');
  assert.equal(body.querySelector('h1, h2, h3, h4, h5, h6'), null);
});

test('heading levels never skip, and an existing H1 is respected', () => {
  let { body } = clean('<h4>Deep</h4><p>x</p><h6>Deeper</h6>');
  assert.deepEqual(texts(body, 'h2'), ['Deep']);
  assert.deepEqual(texts(body, 'h3'), ['Deeper']);
  ({ body } = clean('<h1>Title</h1><h3>Section</h3>'));
  assert.deepEqual(texts(body, 'h2'), ['Section']);
});

test('numbered and lettered lists need two lines counting up', () => {
  const { body } = clean('<p>1. One</p><p>2. Two</p><p>b) Bee</p><p>c) See</p><p>7. Alone</p>');
  assert.deepEqual(texts(body, 'ol:not([type]) > li'), ['One', 'Two']);
  const lettered = body.querySelector('ol[type="a"]');
  assert.equal(lettered.getAttribute('start'), '2');
  assert.deepEqual(texts(lettered, 'li'), ['Bee', 'See']);
  assert.ok(texts(body, 'p').includes('7. Alone'));
});

test('hyphen bullets need two lines; a dash at the start of one sentence is left alone', () => {
  const { body } = clean('<p>- just a dash</p><p>Text</p><p>- one</p><p>- two</p>');
  assert.equal(texts(body, 'p')[0], '- just a dash');
  assert.deepEqual(texts(body, 'ul > li'), ['one', 'two']);
});

test('only real time fragments are joined to the line before', () => {
  const { body } = clean('<p>Quiz opens Monday</p><p>at 9 am</p><p>at the library we meet.</p>');
  assert.deepEqual(texts(body, 'p'), ['Quiz opens Monday at 9 am', 'at the library we meet.']);
});

test('two line breaks split a paragraph; one becomes a space', () => {
  const { body } = clean('<p>Line one<br>continues<br><br>New paragraph</p>');
  assert.deepEqual(texts(body, 'p'), ['Line one continues', 'New paragraph']);
});

test('vague links with readable addresses are rewritten; web-address link text is flagged', () => {
  const { body, changes } = clean(
    '<p><a href="https://www.example.org/guides/apa-citation-basics.pdf">Read more</a> and ' +
      '<a href="https://www.example.org/very/long/path/to/some-page">https://www.example.org/very/long/path/to/some-page</a></p>',
  );
  const links = [...body.querySelectorAll('a')].map((a) => a.textContent);
  assert.equal(links[0], 'Apa Citation Basics (PDF)');
  assert.ok(titles(changes, 'review').includes('Link text is a web address'));
});

test('light or low-contrast colors are flagged; black, gray and white are dropped', () => {
  const { body, changes } = clean(
    '<p><span style="color:#ffcc00">Yellow</span> <span style="color:#333">Dark</span> <span style="color:#fff">White</span> <span style="color:rgb(0, 102, 204)">Blue</span></p>',
  );
  const kept = [...body.querySelectorAll('[style]')].map((el) => el.getAttribute('style'));
  assert.deepEqual(kept, ['color: #ffcc00;', 'color: #0066cc;']);
  assert.deepEqual(titles(changes, 'review'), ['Hard-to-read color #ffcc00', 'Colored text kept (#0066cc)']);
});

test('old <font> tags: color kept when meaningful, the tag itself removed', () => {
  const { body } = clean('<p><font color="#0000cc" face="Arial">Blue</font> and <font size="2">small</font></p>');
  assert.equal(body.querySelector('font'), null);
  stripMarks(body);
  assert.equal(body.innerHTML, '<p><span style="color: #0000cc;">Blue</span> and small</p>');
});

test('file-name alt text is flagged; empty alt is reported as decorative', () => {
  const { changes } = clean('<p><img src="a.png" alt="IMG_2041.jpg"><img src="b.png" alt=""><img src="c.png" alt="Bar chart of enrollment by year"></p>');
  assert.deepEqual(
    changes.map((c) => [c.status, c.title]),
    [
      ['review', 'Image description is a file name'],
      ['info', 'Image marked decorative'],
    ],
  );
});

test('emoji removal can be turned off and keeps ©, ® and ™', () => {
  assert.equal(clean('<p>Done ✅ © 2026™</p>').body.textContent, 'Done © 2026™');
  assert.equal(clean('<p>Done ✅</p>', { removeEmoji: false }).body.textContent, 'Done ✅');
});

test('standard formatting adds inline styles Google Docs keeps', () => {
  const result = cleanHtml('<p>Hello</p><table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></table>', window);
  assert.match(result.html, /<p style="font-family: Arial[^"]*12pt/);
  assert.match(result.html, /<th[^>]*style="[^"]*background-color: #f1f3f4/);
});

test('every change that points at something marks that element', () => {
  const { body, changes } = clean(canvasPage);
  for (const c of changes.filter((c) => c.action)) {
    assert.ok(body.querySelector(`[data-change="${c.id}"]`), `missing target for ${c.title}`);
  }
});

test('plain text paste becomes paragraphs and is escaped', () => {
  assert.equal(textToHtml('One\n\nTwo <b>\r\nThree'), '<p>One</p><p>Two &lt;b&gt;</p><p>Three</p>');
});

test('review-panel helpers: header row, remove color, strip marks', () => {
  const { body } = clean('<table><tr><td>Mon</td><td>Quiz</td></tr><tr><td>Tue</td><td>Lab</td></tr></table><p><span style="color:#e03e2d">Red</span></p>');
  makeHeaderRow(body.querySelector('table'));
  assert.deepEqual(texts(body, 'th'), ['Mon', 'Quiz']);
  removeColor(body, '#e03e2d');
  assert.equal(body.querySelector('[style]'), null);
  stripMarks(body);
  assert.equal(body.querySelector('[data-change]'), null);
});
