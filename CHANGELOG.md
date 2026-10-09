# Changelog

Every change to the page is listed here, newest first.

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
