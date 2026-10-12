# Changelog

Every change to the page is listed here, newest first.

## 0.3.0 (2026-10-12)

### Changed
- **A new look.** A clearer start screen with a large paste area, the programs it works with, and three short notes on what the page does. The header, toolbar and footer were tidied up, and the review list shows its counts as colored labels.
- "What are you citing?" is now two clear choices instead of small radio buttons.
- The finished citation stays in view while you fill in the form.

### Added
- **Try it with an example** loads a sample Canvas page, so you can see what the page does before pasting your own content.

### Fixed
- Items in the review list were drawn as nested panels with extra padding.

## 0.2.0 (2026-10-09)

### Added
- **APA 7 citations.** The tab is now called **Citations**, with an MLA 9 / APA 7 switch that the page remembers. APA entries use initials, "&", up to 20 authors, "(n.d.)" when there's no date, the year only for journal articles, and DOIs as https://doi.org/ links. A reminder explains APA's sentence-case titles.
- **Volume and issue** fields for journal articles (MLA "vol. 12, no. 3"; APA "*12*(3)").
- **Date fields** (year, month, day) instead of free text, so each style writes the date its own way (MLA "12 Mar. 2024", APA "(2024, March 12)").
- DOIs in any form ("10.1234/…", "doi:10.1234/…", or a doi.org link) are recognized.

### Fixed
- Fields that should be hidden (like "Where it appeared" for a whole book) were still showing.
- The Citations tab scrolled sideways on phones.

## 0.1.0 (2026-10-09)

First version, rewritten from scratch to replace Accessibility Studio from the old `desp-app-suite`.

### Added
- **Clean up a paste.** Paste from Canvas, Word, Google Docs or PowerPoint and get clean, accessible text for Google Docs: real headings, real lists, descriptive links, table headers, and no leftover styles, blank lines or emoji.
- **Review list.** Everything that was changed is listed, and the things only a person can fix (image descriptions, links whose address doesn't say what they are, tables without a clear header, colored text) are outlined in the text and can be fixed from the list.
- **Contrast check.** Colored text with too little contrast on a white page (under 4.5:1) is flagged. Canvas's default red (#e03e2d, 4.3:1) is one of them.
- **MLA citations** with several authors, sources without an author, page numbers or web addresses, and access dates. Copying keeps the italics.
- Tests for each kind of paste, run on every push, and publishing to GitHub Pages.

### Fixed (compared with the old app)
- Paragraphs that start with words like "The", "In" or "A" are no longer merged into the paragraph before them.
- A sentence starting "A." or "B." is no longer turned into a list.
- Links to Google Docs and numbered Canvas pages no longer get the document ID as their text.
- Images are no longer given "TODO: Add description" as their description.
- A table's first row is no longer always turned into a header.
- `javascript:` links are removed.
