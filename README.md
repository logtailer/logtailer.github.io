# logtailer.github.io

Sumit Anand's portfolio site — a terminal-emulator-style single page built with
plain HTML/CSS/JS. No framework, no build step.

## Run locally

Native ES modules don't load over `file://`, so serve the directory instead:

```
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Updating content

Everything resume/project-related lives in one place: [`js/content.js`](js/content.js).
Edit that file — nothing else needs to change; the terminal commands and the
plain-text fallback section (`#plain-resume` in `index.html`, rendered by
`js/main.js`) both read from it.

After editing `resume.tex` in the `resume` repo and recompiling, copy the new
`resume.pdf` into this repo's root and commit it — the `resume` command opens
it directly.

## Deploy

This repo is named `logtailer.github.io`, so GitHub Pages serves it
automatically from `main` at the repo root — no settings, no build, no
branch. Just `git push`.
