# Plan 005: Deduplicate narrow-viewport breakpoint and batch scroll calls

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in "STOP conditions" occurs, stop and report — do
> not improvise. When done, update this plan's status row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat f9c3ee4..HEAD -- js/commands.js js/neofetch.js js/terminal.js js/boot.js`
> If any changed since this plan was written, compare against the excerpts
> below before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tech-debt / perf
- **Planned at**: commit `f9c3ee4`, 2026-08-09

## Why this matters

The `640px` narrow-viewport breakpoint is hand-duplicated as three separate
JS checks (`js/commands.js:61-63`'s `isNarrow()`, `js/neofetch.js:13-15`'s
independently-written identical function, and `js/commands.js:177`'s inline
`window.innerWidth <= 640` that bypasses the very helper defined 116 lines
above it in the same file) plus two CSS media queries. This isn't the
deliberate per-command *layout* duplication (verified via git history: that
was tried as a single shared table renderer in commit `29d7c28`, found to
clip content on mobile, and intentionally reverted to per-command branching
in `6e6c8a4` — real, justified duplication, not touched by this plan).
This plan only removes the redundant *boilerplate check* — `cmdSkills`
already shows the drift risk of copy-pasting a literal instead of sharing a
helper. Separately, `scrollToBottom()` forces a synchronous layout reflow
(reads `scrollHeight`, writes `scrollTop`) on every single appended line and
every typewritten character during boot — currently invisible on this tiny
page, but an easy, risk-free batch fix.

## Current state

**Breakpoint duplication:**

```js
// js/commands.js:59-63
// Below this, padded columns stop having room to breathe — matches the
// .mobile-controls breakpoint in terminal.css.
function isNarrow() {
  return window.innerWidth <= 640;
}
```

```js
// js/commands.js:174-177 (inside cmdSkills)
// Fewer columns on narrow viewports so the grid doesn't clip the longer
// skill names (matches the .mobile-controls breakpoint in terminal.css).
const columns = window.innerWidth <= 640 ? 2 : 3;
```

This should be `const columns = isNarrow() ? 2 : 3;` — it isn't, despite
`isNarrow()` being defined 116 lines earlier in the same file.

```js
// js/neofetch.js:11-15
// Matches the .mobile-controls breakpoint in terminal.css — below this, a
// logo+specs side-by-side row is wider than the screen.
function isNarrow() {
  return window.innerWidth <= 640;
}
```

An independently-written, identical function in a different file.

CSS (not touched by this plan, just cross-referenced — see Out of scope):
`css/terminal.css:347` and `css/effects.css:29` each hardcode
`@media (max-width: 640px)` separately.

**Scroll-batching:**

```js
// js/terminal.js:34-52
export function appendLine(text, className) {
  const line = document.createElement("div");
  line.className = className ? `line ${className}` : "line";
  line.textContent = text;
  refs.outputEl.appendChild(line);
  announce(text);
  scrollToBottom();
  return line;
}

export function appendHTML(html, className) {
  const line = document.createElement("div");
  line.className = className ? `line ${className}` : "line";
  line.innerHTML = html;
  refs.outputEl.appendChild(line);
  announce(line.textContent);
  scrollToBottom();
  return line;
}
```

```js
// js/terminal.js:81-90
export function appendBlocks(blocks) {
  for (const block of blocks || []) {
    if (block.type === "html") {
      appendHTML(block.value, block.className);
    } else {
      appendLine(block.value, block.className);
    }
  }
}
```

A multi-line command (e.g. `help`, ~19 lines) calls `scrollToBottom()` once
per line instead of once after the whole batch.

```js
// js/boot.js:62-80 (typewriter)
async function typewriter(text, skip) {
  ...
  const lineEl = terminal.appendLine("");
  let shown = "";
  for (let i = 0; i < text.length; i++) {
    ...
    shown += text[i];
    terminal.updateLineSilently(lineEl, shown);
    await sleep(12);
  }
  terminal.announceText(text);
}
```

```js
// js/terminal.js:58-63
export function updateLineSilently(lineEl, text) {
  lineEl.textContent = text;
  scrollToBottom();
}
```

`content.summary` is ~260 characters (`js/content.js:22-26`) → 260 forced
reflows during the boot typewriter alone.

```js
// js/terminal.js:101-104 — also exported but zero external callers
export function scrollToBottom() {
  const el = refs.scrollEl || refs.outputEl;
  el.scrollTop = el.scrollHeight;
}
```

Confirmed via `grep -rn "scrollToBottom" js/`: only called from within
`terminal.js` itself (`appendLine`, `appendHTML`, `updateLineSilently`,
`appendNode`) — no other module calls `terminal.scrollToBottom()` directly.
The `export` keyword is unnecessary.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Syntax check | `for f in js/commands.js js/neofetch.js js/terminal.js js/boot.js; do node --check "$f" || exit 1; done` | exit 0 |
| Manual verify | `python3 -m http.server 8420`, open in browser | boot sequence and every command still scroll/render correctly |

If Plan 001 has landed: `node --test test/` after this plan's changes — the
`isNarrow`/breakpoint changes don't affect any test from Plan 001, but run
the suite anyway as a regression check.

## Scope

**In scope**:
- `js/commands.js` — `cmdSkills`'s inline check only (Step 1); do not touch
  `isNarrow()`'s definition itself unless moving it per Step 2
- `js/neofetch.js` — remove its duplicate `isNarrow()`, import the shared one
- `js/terminal.js` — `appendBlocks`, `appendLine`, `appendHTML`,
  `updateLineSilently`, and the `scrollToBottom` export (Steps 3-4)
- `js/boot.js` — only if the typewriter throttling change (Step 4, second
  half) requires a call-site update here

**Out of scope**:
- Do NOT touch `css/terminal.css` or `css/effects.css`'s media query values
  — CSS/JS can't share a literal without a build step; this plan explicitly
  leaves the CSS breakpoints as separate hardcoded values (per Plan 004's
  documentation of this as a known, accepted limitation).
- Do NOT change any command's actual *layout logic* (the narrow vs. wide
  branching inside `cmdExperience`/`cmdEducation`/`cmdCerts`/`cmdSkills`) —
  only the boilerplate breakpoint *check* they call. That layout duplication
  was deliberately reverted-to after a real bug (see "Why this matters") and
  is correct as-is.

## Git workflow

- Branch: `advisor/005-dedupe-breakpoint`
- Two commits: one for the breakpoint dedup (Steps 1-2), one for scroll
  batching (Steps 3-4).
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Export `isNarrow()` from `js/commands.js` and use it in `cmdSkills`

In `js/commands.js`, add `export` to the existing `isNarrow` function
declaration (line 61):

```js
export function isNarrow() {
  return window.innerWidth <= 640;
}
```

Then fix `cmdSkills` (line 177) to call it instead of inlining the check:

```js
const columns = isNarrow() ? 2 : 3;
```

**Verify**: `node --check js/commands.js` → exit 0. Dev server, resize to
mobile width, run `skills` → still shows 2 columns (unchanged behavior,
just routed through the shared function now).

### Step 2: Remove `js/neofetch.js`'s duplicate `isNarrow()`, import the shared one

In `js/neofetch.js`, delete the local `isNarrow()` function (lines 13-15)
and its preceding comment, and import it from `commands.js` instead:

```js
import { neofetchLogo } from "./ascii-art.js";
import { escapeHtml } from "./terminal.js";
import { isNarrow } from "./commands.js";
```

Wait — check for a circular import before doing this: `js/commands.js`
already does `import { buildNeofetchBlocks } from "./neofetch.js";` at its
top. Importing `isNarrow` back from `commands.js` into `neofetch.js` would
create a circular dependency (`commands.js` → `neofetch.js` → `commands.js`).
ES modules can sometimes tolerate circular imports if the specific bindings
used don't depend on execution order, but this is fragile and easy to get
wrong.

**Do this instead**: move `isNarrow()` out of `commands.js` into a new tiny
shared module `js/viewport.js`:

```js
// js/viewport.js
// Shared narrow-viewport check — matches the .mobile-controls breakpoint
// in terminal.css (also duplicated in css/effects.css's media query; no
// build step means these three can't share a literal, so keep them in sync
// by hand if the breakpoint ever changes).
export function isNarrow() {
  return window.innerWidth <= 640;
}
```

Then:
- In `js/commands.js`: delete the local `isNarrow` function (lines 61-63,
  including its comment), add `import { isNarrow } from "./viewport.js";`
  near the top with the other imports. Revert the `export` added in Step 1
  above (no longer needed — the canonical definition now lives in
  `viewport.js`).
- In `js/neofetch.js`: delete the local `isNarrow` function (lines 13-15,
  including its comment), add `import { isNarrow } from "./viewport.js";`.

**Verify**: `node --check js/viewport.js js/commands.js js/neofetch.js` all
exit 0. `grep -rn "function isNarrow" js/` → exactly one match, in
`viewport.js`. Dev server: resize to mobile width, run `skills` (2 columns)
and `banner`/`neofetch` (stacked layout) — both should behave identically to
before this change.

### Step 3: Batch `scrollToBottom()` in `appendBlocks`

In `js/terminal.js`, add a silent (non-scrolling) internal append path and
have `appendBlocks` scroll once at the end instead of once per block.
Simplest approach — add an internal parameter rather than duplicating
`appendLine`/`appendHTML`:

```js
function appendLineInternal(text, className, { scroll = true } = {}) {
  const line = document.createElement("div");
  line.className = className ? `line ${className}` : "line";
  line.textContent = text;
  refs.outputEl.appendChild(line);
  announce(text);
  if (scroll) scrollToBottom();
  return line;
}

function appendHTMLInternal(html, className, { scroll = true } = {}) {
  const line = document.createElement("div");
  line.className = className ? `line ${className}` : "line";
  line.innerHTML = html;
  refs.outputEl.appendChild(line);
  announce(line.textContent);
  if (scroll) scrollToBottom();
  return line;
}

export function appendLine(text, className) {
  return appendLineInternal(text, className);
}

export function appendHTML(html, className) {
  return appendHTMLInternal(html, className);
}

export function appendBlocks(blocks) {
  for (const block of blocks || []) {
    if (block.type === "html") {
      appendHTMLInternal(block.value, block.className, { scroll: false });
    } else {
      appendLineInternal(block.value, block.className, { scroll: false });
    }
  }
  scrollToBottom();
}
```

This keeps the public `appendLine`/`appendHTML` API and behavior identical
for every other call site (`appendPromptEcho`, `boot.js`'s `BOOT_LOG`/
neofetch-block loops, etc. — all of which still scroll once per call, which
is correct for them since they're not batch-appending many blocks at once
inside a tight loop the way `appendBlocks` is) — only `appendBlocks`'s
internal loop changes to scroll once at the end.

**Verify**: `node --check js/terminal.js` → exit 0. Dev server, run `help`
(19 lines) — confirm output still appears and the view still auto-scrolls to
the bottom showing the last line, with no visual difference from before.

### Step 4: Un-export `scrollToBottom`; throttle the typewriter's scroll calls

Remove the `export` keyword from `scrollToBottom` (`js/terminal.js:101`) —
confirmed zero external callers, so this is a pure API-surface trim:

```js
function scrollToBottom() {
  const el = refs.scrollEl || refs.outputEl;
  el.scrollTop = el.scrollHeight;
}
```

For the typewriter's per-character scroll (`js/terminal.js`'s
`updateLineSilently`, called from `js/boot.js`'s `typewriter()` once per
character): leave `updateLineSilently` itself unchanged (still scrolls
every call, since other callers may depend on that), and do NOT add
throttling logic to `boot.js` unless you're confident it's a clean,
low-risk change. **Default to doing nothing further here** — Step 3's
batching of `appendBlocks` (the actual N-scrolls-per-command case) is the
real fix; the typewriter's 260-scrolls-for-one-summary-string is a much
smaller, one-time-per-page-load cost that isn't worth adding branching
complexity to `boot.js` for. If you skip this, note in your commit message
that it was considered and deliberately left as-is.

**Verify**: `node --check js/terminal.js js/boot.js` → exit 0. Dev server,
reload, watch the boot sequence — the typewriter intro still types out
character-by-character with no visual change.

## Test plan

If Plan 001 has landed, `js/commands.js`'s `isNarrow` export changes shape
(moves to `js/viewport.js`) — if any test from Plan 001 imports `isNarrow`
from `commands.js` directly, update that import to `viewport.js` instead.
No new tests required by this plan itself (pure refactor + perf batching,
behavior-preserving).

## Done criteria

- [ ] `grep -rn "function isNarrow" js/` → exactly 1 match (in `js/viewport.js`)
- [ ] `grep -n "window.innerWidth <= 640" js/commands.js` → zero matches (was in `cmdSkills`, now calls `isNarrow()`)
- [ ] `js/neofetch.js` imports `isNarrow` from `./viewport.js`, no local definition
- [ ] `appendBlocks` in `js/terminal.js` calls `scrollToBottom()` once per invocation, not once per block
- [ ] `scrollToBottom` is not `export`ed from `js/terminal.js`
- [ ] `for f in js/commands.js js/neofetch.js js/terminal.js js/boot.js js/viewport.js; do node --check "$f" || exit 1; done` exits 0
- [ ] Manual check: `skills`, `banner`/`neofetch`, and `help` all render and scroll identically to before this plan, at both desktop and mobile widths
- [ ] No files outside Scope modified (`git status`)
- [ ] Status row for Plan 005 updated in `plans/README.md`

## STOP conditions

- Any "Current state" excerpt doesn't match the live code.
- The circular-import concern in Step 2 turns out to be wrong (e.g.
  `commands.js` no longer imports from `neofetch.js` by the time this runs)
  — re-verify with `grep -n "^import" js/commands.js js/neofetch.js` before
  assuming the `viewport.js` extraction is still necessary; if there's no
  cycle, a direct import is simpler and preferred, but confirm first rather
  than assuming this plan's analysis is still accurate.
- A verification step fails twice after a reasonable fix attempt.

## Maintenance notes

- Plan 004 (AGENTS.md) should run *after* this plan — it documents
  `isNarrow()` as living in one place, which is only true post-this-plan.
- The CSS breakpoints (`css/terminal.css:347`, `css/effects.css:29`) remain
  separate hardcoded `640px` literals — not a bug, just a known, documented
  (via Plan 004) limitation of having no build step to share constants
  across languages.
