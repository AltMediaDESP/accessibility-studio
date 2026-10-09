# Accessibility Studio

A web page that cleans up content pasted from **Canvas, Word, Google Docs or PowerPoint** into accessible text for Google Docs. It also builds **MLA and APA citations**.

**Use it:** https://altmediadesp.github.io/accessibility-studio/

Everything happens in your browser tab. What you paste is never uploaded or saved anywhere, and the page needs no sign-in.

## Cleaning up a paste

1. Copy content from Canvas, Word, Google Docs or PowerPoint.
2. Click the box on the page and press <kbd>Ctrl</kbd>+<kbd>V</kbd>.
3. The cleaned text appears on a white page you can edit. Next to it, the **Review** list shows:
   - **Needs you:** things only a person can fix, outlined in the text. Most can be fixed right in the list: type an image description, rewrite a link, or turn a table's first row into its header.
   - **Fixed automatically:** what was changed, so you can check it. Click any item to jump to it in the text.
4. Click **Copy for Google Docs** and paste into your document.

### What it does

| Problem in the paste | What happens |
|---|---|
| Text that is only *styled* as a heading (big or bold) | Becomes a real heading (H2, H3…). Sizes are compared with the paste's own body text, so it works for any source. |
| Heading levels that skip (H2 then H4) | Fixed so no level is skipped. Content starts at H2, because the document title is H1. |
| Lines typed with `•`, `-`, `1.` or `a)` | Become real lists. Numbers and letters only count when two or more lines count up, so "A. Smith argues…" is left alone. |
| "Click here", "read more" and other vague links | Rewritten when the address has a readable name, like `Library Research Guide (Canvas Page)`. When it doesn't (a Google Doc ID, a numbered Canvas assignment), the link is listed for you to describe. |
| A web address used as link text | Listed, with a suggested description. |
| Images with no description | Listed with a box to type one, or to mark the image decorative. Images whose description is a file name (`IMG_2041.jpg`) are listed too. Nothing is made up. |
| Tables with no header row | The first row becomes the header if it is bold or shaded; otherwise the table is listed with a button to do it. |
| Colored text | Kept, and listed: color can't be the only way something is marked. Colors with too little contrast on white (under 4.5:1) are flagged. Black, gray and white text goes back to normal. |
| Underlined text that isn't a link | Underline removed (it looks like a link). |
| Emoji | Removed, since screen readers read their names aloud. Turn this off under **Options**. |
| Blank lines, stray line breaks, Word and Google Docs leftovers | Cleaned out. |
| Canvas due dates split across lines ("Due Friday" / "at 11:59pm") | Joined. Only real time fragments are joined; normal paragraphs are never merged. |

With **Standard formatting** on (the default), the result uses Arial 12pt with 1.5 line spacing and consistent heading sizes, written as inline styles so Google Docs keeps them.

## Citations

Pick **MLA 9** or **APA 7** at the top of the **Citations** tab (the page remembers your choice), fill in what you know about the source, and the full entry (Works Cited or reference list) and the in-text citation update as you type.

It handles one, two, or more authors (MLA "et al."; APA lists up to 20), group authors like agencies, sources with no author or no date, journal volume and issue, page numbers, web addresses and DOIs, and MLA access dates. APA journal articles get the year only, as APA requires. **Copy** keeps the italics and the hanging indent when pasted into Google Docs.

APA writes article and book titles in sentence case (only the first word and names capitalized). The page can't change capitalization without breaking names, so it uses titles as typed and shows a reminder.

## Developing

You need [Node.js](https://nodejs.org/) 20 or newer.

```sh
npm install
npm run dev      # the page with live reload, at http://localhost:5173
npm test         # cleaning and citation tests
npm run build    # the finished page, in dist/
```

### Project layout

| Path | What it does |
|---|---|
| `src/lib/clean.js` | All the cleaning rules, in the order they run. |
| `src/lib/links.js` | Works out a link's type and a readable name from its address. |
| `src/lib/color.js` | Color parsing and the contrast check. |
| `src/lib/mla.js`, `src/lib/apa.js`, `src/lib/cite-common.js` | MLA and APA formatting. |
| `src/main.js`, `index.html`, `src/styles.css` | The page. |
| `tests/` | Tests, run with Node's built-in test runner and [jsdom](https://github.com/jsdom/jsdom). |

### Adding a test paste

`tests/fixtures.js` holds sample clipboard contents from each program. The current samples were written by hand to match what each program puts on the clipboard. Real pastes are better: when a paste comes out wrong, save its HTML as a new fixture and add a test for what it should look like. To get the HTML a paste contains, paste into the page, open the browser's developer console and run:

```js
navigator.clipboard.read().then(async ([item]) => console.log(await (await item.getType('text/html')).text()))
```

### Publishing

Every push to `main` runs the tests and, if they pass, publishes the page to GitHub Pages (`.github/workflows/deploy.yml`). One-time setup: in the repository's **Settings → Pages**, set **Source** to **GitHub Actions**.

See [CHANGELOG.md](CHANGELOG.md) for what changed in each version.

## History

This replaces the Accessibility Studio app from the old `desp-app-suite` repo (December 2025). That version merged ordinary paragraphs together, turned sentences starting "A." into lists, used document IDs as link text and inserted "TODO" as image descriptions. This one was rewritten from scratch to keep the same idea without those problems.
