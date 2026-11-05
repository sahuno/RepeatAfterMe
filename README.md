# Repeat After Me

Visual lessons on repeated DNA (transposable elements) in the mouse and human genomes. Written for the newcomer who has to analyse repeats for the first time, and readable by anyone curious.

Live site: https://sahuno.github.io/RepeatAfterMe/

## How the site is built

- Plain HTML, one file per page, no build step. Open `index.html` in a browser and it works.
- `assets/site.css` holds the shared look: the four class colours (LINE, SINE, LTR, DNA), fonts, light and dark mode.
- Every link is relative, because the site is served under `/RepeatAfterMe/`.
- Hosted by GitHub Pages from the `main` branch of this repository.

To view locally:

```bash
python3 -m http.server 8000
# then open http://localhost:8000/
```

## Reporting a mistake

Open an issue. Every figure lists its sources; if a source does not say what the figure says, that is a bug.

## What is and is not here

This repository holds only the public site. Planning notes, drafts and anything derived from unpublished lab data stay outside it.

## License

Not yet chosen. Until a license file is added, all rights are reserved.
