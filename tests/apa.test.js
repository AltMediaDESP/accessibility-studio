import { test } from 'node:test';
import assert from 'node:assert/strict';

import { reference, inText, authorList, initials, formatDate } from '../src/lib/apa.js';

const journal = {
  kind: 'part',
  authors: [{ first: 'Jane Marie', last: 'Doe' }, { first: 'John', last: 'Smith' }],
  title: 'Reading habits of community college students',
  container: 'Journal of College Reading',
  volume: '12',
  issue: '3',
  publisher: '',
  date: { year: '2024', month: '', day: '' },
  location: 'https://doi.org/10.1234/jcr.2024.003',
};

test('journal article with a DOI', () => {
  const ref = reference(journal);
  assert.equal(ref.text, 'Doe, J. M., & Smith, J. (2024). Reading habits of community college students. Journal of College Reading, 12(3). https://doi.org/10.1234/jcr.2024.003');
  assert.equal(ref.html, 'Doe, J. M., &amp; Smith, J. (2024). Reading habits of community college students. <i>Journal of College Reading</i>, <i>12</i>(3). https://doi.org/10.1234/jcr.2024.003');
});

test('journal article with page numbers', () => {
  const ref = reference({ ...journal, location: '45-67' });
  assert.equal(ref.text, 'Doe, J. M., & Smith, J. (2024). Reading habits of community college students. Journal of College Reading, 12(3), 45–67.');
});

test('journal articles use the year only, even when a full date is filled in', () => {
  const ref = reference({ ...journal, date: { year: '2024', month: '3', day: '12' } });
  assert.match(ref.text, /^Doe, J\. M\., & Smith, J\. \(2024\)\. /);
});

test('a DOI typed as "doi:10…" is written as a link', () => {
  assert.match(reference({ ...journal, location: 'doi:10.1234/abc' }).text, /https:\/\/doi\.org\/10\.1234\/abc$/);
});

test('book: italic title and publisher', () => {
  const ref = reference({ kind: 'whole', authors: [{ first: 'Toni', last: 'Morrison' }], title: 'Beloved', publisher: 'Knopf', date: { year: '1987' } });
  assert.equal(ref.text, 'Morrison, T. (1987). Beloved. Knopf.');
  assert.equal(ref.html, 'Morrison, T. (1987). <i>Beloved</i>. Knopf.');
});

test('web page with a full date and no author: the title moves to the front', () => {
  const ref = reference({
    kind: 'part',
    authors: [],
    title: 'How to cite a website',
    container: '',
    publisher: 'Purdue OWL',
    date: { year: '2024', month: '3', day: '12' },
    location: 'https://owl.purdue.edu/cite',
  });
  assert.equal(ref.text, 'How to cite a website. (2024, March 12). Purdue OWL. https://owl.purdue.edu/cite');
  assert.equal(ref.html, '<i>How to cite a website</i>. (2024, March 12). Purdue OWL. https://owl.purdue.edu/cite');
});

test('news article on a website: title plain, site italic, publisher left out when it is the site', () => {
  const ref = reference({
    kind: 'part',
    authors: [{ first: 'Ana', last: 'Ruiz' }],
    title: 'Colleges expand tutoring',
    container: 'The New York Times',
    publisher: 'The New York Times',
    date: { year: '2025', month: '9', day: '' },
    location: 'https://nytimes.com/x',
  });
  assert.equal(ref.text, 'Ruiz, A. (2025, September). Colleges expand tutoring. The New York Times. https://nytimes.com/x');
});

test('names, dates and many authors', () => {
  assert.equal(initials('Jean-Paul'), 'J.-P.');
  assert.equal(initials('mary ann'), 'M. A.');
  assert.equal(formatDate({ year: '' }), '(n.d.)');
  assert.equal(authorList([{ last: 'World Health Organization' }]), 'World Health Organization');
  const three = [{ first: 'A', last: 'One' }, { first: 'B', last: 'Two' }, { first: 'C', last: 'Three' }];
  assert.equal(authorList(three), 'One, A., Two, B., & Three, C.');
  const many = Array.from({ length: 22 }, (_, i) => ({ first: 'X', last: `A${i + 1}` }));
  assert.equal(authorList(many), `${Array.from({ length: 19 }, (_, i) => `A${i + 1}, X.`).join(', ')}, . . . A22, X.`);
});

test('in-text citations', () => {
  const one = { ...journal, authors: [{ first: 'Jane', last: 'Doe' }], location: '42' };
  assert.equal(inText(one).text, '(Doe, 2024, p. 42)');
  assert.equal(inText(one, 'Reading is changing.').text, '“Reading is changing” (Doe, 2024, p. 42).');
  assert.equal(inText({ ...journal, location: '45-67' }).text, '(Doe & Smith, 2024, pp. 45–67)');
  assert.equal(inText({ ...journal, authors: [{ last: 'A' }, { last: 'B' }, { last: 'C' }] }).text, '(A et al., 2024)');
  assert.equal(inText({ ...journal, authors: [], date: {} }).text, '(“Reading habits of community,” n.d.)');
  assert.equal(inText({ kind: 'whole', authors: [], title: 'Beloved', date: { year: '1987' } }).html, '(<i>Beloved</i>, 1987)');
});
