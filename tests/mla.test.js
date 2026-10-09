import { test } from 'node:test';
import assert from 'node:assert/strict';

import { worksCited, inText, authorList, formatLocation, formatDate } from '../src/lib/mla.js';

const article = {
  kind: 'part',
  authors: [{ first: 'Jane', last: 'Doe' }],
  title: 'The Future of Reading',
  container: 'The Atlantic',
  publisher: '',
  date: { year: '2024', month: '3', day: '12' },
  location: 'https://www.theatlantic.com/reading',
  accessed: '',
};

test('article on a website', () => {
  const entry = worksCited(article);
  assert.equal(entry.text, 'Doe, Jane. “The Future of Reading.” The Atlantic, 12 Mar. 2024, www.theatlantic.com/reading.');
  assert.equal(entry.html, 'Doe, Jane. “The Future of Reading.” <i>The Atlantic</i>, 12 Mar. 2024, www.theatlantic.com/reading.');
});

test('book on its own: the title is in italics', () => {
  const entry = worksCited({ kind: 'whole', authors: [{ first: 'Toni', last: 'Morrison' }], title: 'Beloved', publisher: 'Knopf', date: { year: '1987' } });
  assert.equal(entry.text, 'Morrison, Toni. Beloved. Knopf, 1987.');
  assert.equal(entry.html, 'Morrison, Toni. <i>Beloved</i>. Knopf, 1987.');
});

test('two authors, three or more authors', () => {
  assert.equal(authorList([{ first: 'Jane', last: 'Doe' }, { first: 'John', last: 'Smith' }]), 'Doe, Jane, and John Smith');
  assert.equal(authorList([{ first: 'A', last: 'One' }, { first: 'B', last: 'Two' }, { first: 'C', last: 'Three' }]), 'One, A, et al');
  assert.match(worksCited({ ...article, authors: [{ first: 'A', last: 'One' }, { first: 'B', last: 'Two' }, { first: 'C', last: 'Three' }] }).text, /^One, A, et al\. “/);
});

test('no author: the entry starts with the title', () => {
  assert.equal(worksCited({ ...article, authors: [] }).text, '“The Future of Reading.” The Atlantic, 12 Mar. 2024, www.theatlantic.com/reading.');
});

test('a title ending in a question mark gets no extra period', () => {
  assert.equal(worksCited({ ...article, title: 'Who Reads Now?' }).text, 'Doe, Jane. “Who Reads Now?” The Atlantic, 12 Mar. 2024, www.theatlantic.com/reading.');
});

test('page numbers and access dates', () => {
  assert.equal(formatLocation('42'), 'p. 42');
  assert.equal(formatLocation('12 – 15'), 'pp. 12-15');
  const entry = worksCited({ ...article, location: '12-15', accessed: '3 Oct. 2026' });
  assert.equal(entry.text, 'Doe, Jane. “The Future of Reading.” The Atlantic, 12 Mar. 2024, pp. 12-15. Accessed 3 Oct. 2026.');
});

test('volume, issue and DOI', () => {
  const entry = worksCited({ ...article, container: 'Journal of College Reading', volume: '12', issue: '3', location: 'doi:10.1234/abc' });
  assert.equal(entry.text, 'Doe, Jane. “The Future of Reading.” Journal of College Reading, vol. 12, no. 3, 12 Mar. 2024, https://doi.org/10.1234/abc.');
});

test('dates: MLA month abbreviations', () => {
  assert.equal(formatDate({ year: '2025', month: '9', day: '' }), 'Sept. 2025');
  assert.equal(formatDate({ year: '2025', month: '6', day: '1' }), '1 June 2025');
  assert.equal(formatDate({ year: '2025' }), '2025');
});

test('in-text citations', () => {
  const src = { ...article, location: '42' };
  assert.equal(inText(src, 'Reading is changing.').text, '“Reading is changing” (Doe 42).');
  assert.equal(inText(src, 'Is reading changing?').text, '“Is reading changing?” (Doe 42).');
  assert.equal(inText({ ...src, authors: [{ first: 'J', last: 'Doe' }, { first: 'K', last: 'Lee' }] }).text, '(Doe and Lee 42)');
  assert.equal(inText({ ...src, authors: [{ last: 'A' }, { last: 'B' }, { last: 'C' }] }).text, '(A et al. 42)');
  // a URL is not a page number
  assert.equal(inText(article).text, '(Doe)');
  // no author: short title
  assert.equal(inText({ ...src, authors: [] }).text, '(“The Future of Reading” 42)');
  assert.equal(inText({ kind: 'whole', authors: [], title: 'Beloved', location: '5' }).html, '(<i>Beloved</i> 5)');
});

test('text is escaped in the HTML version', () => {
  assert.equal(worksCited({ kind: 'whole', authors: [], title: 'A <b> & C', publisher: 'P', date: {} }).html, '<i>A &lt;b&gt; &amp; C</i>. P.');
});
