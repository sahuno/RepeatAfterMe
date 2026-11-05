# Repeat After Me

Visual lessons on repeated DNA (transposable elements) in mouse and human. For people analysing repeats for the first time.

Live site: https://sahuno.github.io/RepeatAfterMe/

## How the site is built

- Plain HTML pages plus one small shared `assets/` folder, no build step. Open `index.html` in a browser and it works.
- `assets/site.css` holds the shared look: the four class colours (LINE, SINE, LTR, DNA), fonts, light and dark mode.
- Every link is relative, because the site is served under `/RepeatAfterMe/`.
- Hosted by GitHub Pages from the `main` branch of this repository.
- `data/` holds small summaries of public UCSC RepeatMasker tables; `prep/` holds the Python scripts that made them, so every number can be rebuilt. The raw tables are not stored here.

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
