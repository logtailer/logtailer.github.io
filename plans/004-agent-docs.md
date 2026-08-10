# Plan 004: Add AGENTS.md and extend README with contributor patterns

> **Executor instructions**: Follow this plan step by step. When done,
> update this plan's status row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat f9c3ee4..HEAD -- README.md js/commands.js js/neofetch.js css/terminal.css`
> If any changed since this plan was written, compare against the excerpts
> below before proceeding; on a mismatch, treat it as a STOP condition.
>
> **Run this plan after Plan 005 has landed** — Step 2 below documents the
> `isNarrow()` convention as consistent across the codebase; if Plan 005
> hasn't landed yet, `cmdSkills` still bypasses the shared helper and this
> plan's doc would describe a state that isn't true yet. If Plan 005's
> status (in `plans/README.md`) is not DONE, STOP and report rather than
> writing docs that describe an aspirational, not actual, state.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: 005
- **Category**: dx
- **Planned at**: commit `f9c3ee4`, 2026-08-09

## Why this matters

This repo's primary editor going forward is AI coding agents — all 12
existing commits landed the same day in what reads as an agent-driven
pairing session, and there's no `CLAUDE.md`/`AGENTS.md`/`CONTRIBUTING.md`
anywhere. The conventions a future session most needs — how the command
registry works, how to add a theme, how the narrow-viewport pattern works —
currently only exist as scattered code comments that have to be
reverse-engineered from `commands.js` each time. `README.md` also documents
only "how to update content," nothing about extending the site's behavior.

## Current state

`README.md` (full current content):
```markdown
# logtailer.github.io

Sumit Anand's portfolio site — a terminal-emulator-style single page built with
plain HTML/CSS/JS. No framework, no build step.

## Run locally

Native ES modules don't load over `file://`, so serve the directory instead:

    python3 -m http.server 8000

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
```

(If Plan 001 landed first, a "## Tests" section will also exist — leave it
in place, insert this plan's new content after "## Updating content" and
before "## Deploy", or after "## Tests" if present, matching the existing
section order.)

Conventions to document, evidenced in the current code:
- Command registry shape — `js/commands.js:336-353`, the `COMMANDS` object;
  each entry is `{ summary, run, aliases, data?, hidden? }`.
- `-o json`/`-o yaml` support — a command supports it by having a `data`
  field (a function returning the raw value to serialize); commands without
  one (like `mail`, `resume`, `clear`) are actions, not data views, and
  correctly have no `data` field.
- Theme presets — `js/theme.js`, the `THEMES` object; each entry is
  `{ label, vars, prompt(meta) }`, applied via CSS custom properties.
- The narrow-viewport convention — a single `isNarrow()` helper (after Plan
  005, defined once and imported everywhere it's needed) checked against a
  `640px` breakpoint that must stay in sync with the same literal value in
  `css/terminal.css` and `css/effects.css`'s `@media (max-width: 640px)`
  queries (JS and CSS can't share a literal without a build step, so this is
  a "keep these three things in sync by hand" convention, not something
  fully enforced).

## Scope

**In scope**:
- `AGENTS.md` (create, repo root)
- `README.md` — add one new section only ("## Extending")

**Out of scope**:
- Do not modify any `.js`/`.css` file in this plan — it's documentation only.
- Do not restructure or rename any existing README section.

## Git workflow

- Branch: `advisor/004-agent-docs`
- One commit.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Write `AGENTS.md`

Create `AGENTS.md` at the repo root with these sections (write in your own
words, matching this repo's terse comment style — don't pad):

1. **No build step** — plain HTML/CSS/JS, no npm, no bundler. Edit a file,
   refresh the browser. Serve locally with `python3 -m http.server 8420`
   (ES modules don't load over `file://`).
2. **Content lives in one place** — `js/content.js` is the single source of
   truth for every resume/project fact. Never hardcode resume data anywhere
   else; every renderer (terminal commands, the plain-text `#plain-resume`
   fallback, `-o json`/`-o yaml` output) reads from this file.
3. **Adding a command** — add an entry to the `COMMANDS` object in
   `js/commands.js` (`{ summary, run, aliases, data? }`). Give it a `data`
   function (returning the raw value, not formatted blocks) if it should
   support `-o json`/`-o yaml`; skip `data` for action commands with nothing
   to serialize.
4. **Adding a theme** — add one entry to `THEMES` in `js/theme.js`
   (`{ label, vars, prompt(meta) }`, `vars` being CSS custom-property
   overrides). No other file needs to change.
5. **Narrow-viewport handling** — always use the shared `isNarrow()` helper
   (checks `window.innerWidth <= 640`) rather than inlining the check; the
   same `640` breakpoint is also hardcoded in `css/terminal.css` and
   `css/effects.css`'s media queries — if you ever change the breakpoint,
   update all three by hand.
6. **Tests** (only if Plan 001 has landed — check for a `test/` directory
   before including this section): `node --test test/`, no install needed.

### Step 2: Add an "## Extending" section to `README.md`

Insert after "## Updating content" (and after "## Tests" if Plan 001 added
one), before "## Deploy":

```markdown
## Extending

- **Commands** — add an entry to `COMMANDS` in `js/commands.js`. See
  `AGENTS.md` for the shape.
- **Themes** — add an entry to `THEMES` in `js/theme.js`. See `AGENTS.md`.
- **Responsive/narrow-viewport behavior** — use the shared `isNarrow()`
  helper; the `640px` breakpoint is also duplicated in `css/terminal.css`
  and `css/effects.css` and must be kept in sync by hand (no build step
  means JS and CSS can't share a literal constant).
```

Keep this short — it's a pointer to `AGENTS.md`, not a duplicate of it.

**Verify**: `cat AGENTS.md README.md` — read both, confirm no contradictions
between them (e.g. both should state the `640px` breakpoint the same way).

## Test plan

Documentation-only plan — no automated tests apply. Verification is a read-
through: confirm every claim in `AGENTS.md`/the new README section matches
the actual current code (re-check against `js/commands.js`'s `COMMANDS`
shape, `js/theme.js`'s `THEMES` shape, and the post-Plan-005 state of
`isNarrow()` before finalizing).

## Done criteria

- [ ] `AGENTS.md` exists at repo root, covers all 5-6 points in Step 1
- [ ] `README.md` has a new "## Extending" section
- [ ] Every claim in both files is verified true against the current code
      (re-read `js/commands.js`, `js/theme.js` while writing — don't write
      from memory of this plan alone)
- [ ] No `.js`/`.css` files modified (`git status`)
- [ ] Status row for Plan 004 updated in `plans/README.md`

## STOP conditions

- Plan 005's status (in `plans/README.md`) is not DONE — stop and report;
  don't write docs describing a not-yet-true state.
- Any of the "Current state" code citations don't match the live code.

## Maintenance notes

- If Plan 006 (the `commands.js` split) lands later, `AGENTS.md`'s "Adding a
  command" section will need a small update to point at wherever the
  `COMMANDS` registry ends up living post-split.
- If Plan 007 (JSON-LD spike) produces a shipped feature, consider whether
  `AGENTS.md` needs a note about keeping the JSON-LD block in sync with
  `content.js` too, the same way the plain-text fallback already is.
