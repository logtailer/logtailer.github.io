# Plan 003: Add SEO / link-sharing metadata

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in "STOP conditions" occurs, stop and report — do
> not improvise. When done, update this plan's status row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat f9c3ee4..HEAD -- index.html`
> If it changed since this plan was written, compare against the excerpt
> below before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: docs
- **Planned at**: commit `f9c3ee4`, 2026-08-09

## Why this matters

This site's entire purpose is being found and shared — a recruiter pastes
the URL into LinkedIn, Slack, or an email. Right now `index.html`'s `<head>`
has no favicon, no Open Graph/Twitter Card tags, no canonical URL, and the
repo root has no `robots.txt`/`sitemap.xml` (all confirmed absent). When
shared, the link preview is currently bare: no image, no custom title/description
card, generic browser-tab icon. This is a first-impression cost for exactly
the audience the site targets, and it's a same-day fix.

## Current state

`index.html:1-11` (full `<head>` as it exists today):
```html
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Sumit Anand — DevOps / SRE Engineer</title>
  <meta name="description" content="Sumit Anand — Site Reliability Engineer. A terminal-styled portfolio: resume, experience, and personal infrastructure projects." />
  <link rel="stylesheet" href="css/reset.css" />
  <link rel="stylesheet" href="css/terminal.css" />
  <link rel="stylesheet" href="css/effects.css" />
</head>
```

Confirmed absent from the repo root (via `ls favicon.ico robots.txt
sitemap.xml`, all "No such file or directory"): favicon, robots.txt,
sitemap.xml. No `og:*`/`twitter:*` meta tags anywhere in `index.html`.

The site is deployed via GitHub Pages from the `logtailer.github.io` repo's
`main` branch at the repo root (per that repo's own `README.md`), so its
production URL is `https://logtailer.github.io/`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Manual verify | `python3 -m http.server 8420` then open `http://localhost:8420` | site loads unchanged visually |
| Validate markup | view page source, confirm new tags present | (no automated validator available offline — see Step 4) |

## Scope

**In scope**:
- `index.html` — `<head>` additions only
- `favicon.ico` or `favicon.svg` (create — see Step 1 for what asset to use)
- `robots.txt` (create, repo root)
- `sitemap.xml` (create, repo root)

**Out of scope**:
- Do not add any analytics/tracking script — the site is deliberately
  tracking-free; this plan is metadata only.
- Do not change the page `<title>` or existing `<meta name="description">` —
  reuse them for the new Open Graph tags rather than writing new copy.
- Do not add a build step to generate these files dynamically — they're
  static, hand-authored, matching the rest of the site's "no build step"
  architecture.

## Git workflow

- Branch: `advisor/003-seo-metadata`
- One commit is fine for this whole plan.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add a favicon

This needs a real decision the executor can't make alone: what image to use.
Two options, in order of preference:
1. If an existing image asset is available in the repo or provided by the
   operator, use it.
2. Otherwise, generate a simple text/emoji-based favicon: a minimal inline
   SVG favicon works without any image-editing tool and needs no external
   asset file:

```html
<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🖥️</text></svg>" />
```

(A terminal/monitor emoji as a placeholder is reasonable given the site's
terminal theme — swap for a real designed favicon later if the operator
wants one; note this choice in your commit message.)

Add this `<link>` tag to `index.html`'s `<head>`, after the existing
`<meta name="description">` line.

**Verify**: reload the dev server in a browser, confirm a favicon appears in
the browser tab (not the default blank/globe icon).

### Step 2: Add Open Graph and Twitter Card tags

Add after the favicon link:

```html
<meta property="og:type" content="profile" />
<meta property="og:title" content="Sumit Anand — DevOps / SRE Engineer" />
<meta property="og:description" content="Sumit Anand — Site Reliability Engineer. A terminal-styled portfolio: resume, experience, and personal infrastructure projects." />
<meta property="og:url" content="https://logtailer.github.io/" />
<meta name="twitter:card" content="summary" />
<meta name="twitter:title" content="Sumit Anand — DevOps / SRE Engineer" />
<meta name="twitter:description" content="Sumit Anand — Site Reliability Engineer. A terminal-styled portfolio: resume, experience, and personal infrastructure projects." />
```

Reuse the exact existing `<title>` text and `<meta name="description">`
content verbatim for `og:title`/`twitter:title` and
`og:description`/`twitter:description` — do not write new copy.

Note: `og:image`/`twitter:image` are intentionally omitted from this plan —
generating a good preview image (e.g. a screenshot of the terminal, or the
neofetch banner rendered to an image) is a separate task requiring either a
manual screenshot or a render pipeline, and is explicitly out of scope here.
If the operator wants to add one later, `twitter:card` should change from
`summary` to `summary_large_image` at the same time.

**Verify**: `grep -c "og:\|twitter:" index.html` → 7 (the 7 new meta tags
above, `card` counts once).

### Step 3: Add a canonical URL

```html
<link rel="canonical" href="https://logtailer.github.io/" />
```

Add this alongside the other `<link>` tags.

**Verify**: `grep -n "canonical" index.html` → one match, the line above.

### Step 4: Add `robots.txt` and `sitemap.xml`

`robots.txt` (repo root, new file):
```
User-agent: *
Allow: /

Sitemap: https://logtailer.github.io/sitemap.xml
```

`sitemap.xml` (repo root, new file):
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://logtailer.github.io/</loc>
  </url>
</urlset>
```

**Verify**: `cat robots.txt sitemap.xml` → both print the content above
exactly. No automated XML validator is assumed available — visually confirm
the XML is well-formed (matching angle brackets, no stray characters).

## Test plan

No automated tests apply to static metadata tags. Manual verification only,
per each step above. If Plan 001's test infrastructure exists, no new test
file is needed here — this is pure markup/static-file work.

## Done criteria

- [ ] `index.html` has a `<link rel="icon">`, 7 OG/Twitter meta tags, and a
      `<link rel="canonical">`, all inside `<head>`
- [ ] `robots.txt` exists at repo root with the content in Step 4
- [ ] `sitemap.xml` exists at repo root with the content in Step 4
- [ ] Page still loads and renders identically in a browser (visual
      regression check — this plan changes zero visible page content)
- [ ] No files outside the Scope list modified (`git status`)
- [ ] Status row for Plan 003 updated in `plans/README.md`

## STOP conditions

- The `<head>` excerpt in "Current state" doesn't match the live
  `index.html` (drift since this plan was written).
- You're asked to produce a real designed favicon/OG image and have no image
  tooling available — use the inline-SVG placeholder from Step 1 and note
  in your commit message that a real image asset should replace it later;
  don't block the whole plan on this.

## Maintenance notes

- If the operator ever buys a custom domain (mentioned as a future
  possibility during the original site-build), the
  `og:url`/`canonical`/`sitemap.xml` URLs in this plan all hardcode
  `https://logtailer.github.io/` and will need updating to match.
- If an `og:image` is added later, remember to bump `twitter:card` from
  `summary` to `summary_large_image` at the same time (noted in Step 2).
