# Plan 002: Quick correctness and consistency fixes

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in "STOP conditions" occurs, stop and report — do
> not improvise. When done, update this plan's status row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat f9c3ee4..HEAD -- js/commands.js js/mailform.js js/terminal.js js/main.js js/content.js css/effects.css`
> If any of these changed since this plan was written, compare the "Current
> state" excerpts below against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (independent of Plan 001, though if Plan 001 landed
  first, its `extractOutputFlag` test for the trailing-flag case needs the
  update noted in Plan 001's Maintenance notes once Step 1 below lands)
- **Category**: bug
- **Planned at**: commit `f9c3ee4`, 2026-08-09

## Why this matters

Six small, independently-verified issues, each low severity on its own but
each a real, confirmed gap: a CLI-flag parsing bug that produces a confusing
error message, two `mailto:` URL-building inconsistencies, one gap in the
site's only HTML-escaping function, one field that was deliberately removed
from every display path but left in the data model, and one code comment
that overclaims what a CSS media query actually detects. Bundled into one
plan because each fix is 1-5 lines — six separate plans would be worse
ergonomics than one focused pass.

## Current state

**Step 1 target** — `js/commands.js:68-79`:
```js
function extractOutputFlag(args) {
  const rest = [];
  let format = null;
  for (let i = 0; i < args.length; i++) {
    if ((args[i] === "-o" || args[i] === "--output") && i + 1 < args.length) {
      format = args[i + 1].toLowerCase();
      i++;
    } else {
      rest.push(args[i]);
    }
  }
  return { format, rest };
}
```
When `-o`/`--output` is the last token with no value following it, the
`i + 1 < args.length` guard fails, so the literal string `"-o"` falls through
to the `else` branch and gets pushed onto `rest` as if it were a positional
argument. Confirmed reachable: `projects -o` → `dispatchNamed` receives
`rest: ["-o"]`, `format: null` → `cmdProjects` treats `"-o"` as a project
slug → `"projects: no such project '-o'"`. Confusing; the user's actual
intent (request structured output) is silently discarded with no relevant
error.

**Step 2 target** — `js/mailform.js:31-38`:
```js
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const from = form.elements.from.value.trim();
  const subject = form.elements.subject.value.trim();
  const message = form.elements.message.value.trim();
  const body = `${message}\n\n— from ${from}`;
  const mailto = `mailto:${toEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailto;
```
`subject` and `body` are passed through `encodeURIComponent()`; `toEmail`
(the function's first parameter, called with `content.contact.email` from
`js/main.js:46`) is not. Currently harmless — `content.contact.email` is
`"as.anandsumit@gmail.com"`, which contains no URL-significant characters —
but it's an inconsistency: if that address ever changed to contain one, the
resulting `mailto:` URL would silently malform (truncated address or extra
query params) with no error surfaced anywhere.

**Step 3 target** — `js/main.js:135-145` (the `el()` helper inside
`renderPlainFallback`):
```js
const el = (tag, opts = {}, children = []) => {
  const node = document.createElement(tag);
  if (opts.text) node.textContent = opts.text;
  if (opts.href) {
    node.href = opts.href;
    node.rel = "noopener noreferrer";
    node.target = "_blank";
  }
  for (const child of children) node.appendChild(child);
  return node;
};
```
Used at `js/main.js:152` to build the plain-text-fallback's email link:
`el("a", { href: \`mailto:${content.contact.email}\`, text: content.contact.email })`.
This unconditionally sets `target="_blank"` for *any* href, including
`mailto:` links — which in several browsers leaves behind a blank new tab
after the mail client opens. Compare `js/commands.js:267` (the interactive
terminal's `contact` command), which renders the same email address as a
plain `<a href="mailto:...">` with no `target="_blank"` — so the two paths
currently behave differently for the identical data.

**Step 4 target** — `js/terminal.js:107-113`:
```js
export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
```
Missing a `'` → `&#39;` replacement. This is the only sanitizer used
anywhere `content.js` data is interpolated into `.innerHTML` (certs links at
`js/commands.js:199-220`, contact links at `js/commands.js:267-269`, the
neofetch block at `js/neofetch.js`). Not currently exploitable — every
attribute built this way uses double quotes consistently and all
interpolated values come from trusted static `content.js`, not user input —
but it's the site's one HTML-injection safety boundary and should actually
cover all 5 standard characters.

**Step 5 target** — `js/content.js:13-20`:
```js
contact: {
  phone: "(+91)-9156011787",
  email: "as.anandsumit@gmail.com",
  linkedin: "linkedin.com/in/asanandsumit",
  linkedinUrl: "https://www.linkedin.com/in/asanandsumit/",
  github: "github.com/logtailer",
  githubUrl: "https://github.com/logtailer",
},
```
`phone` is dead data. Commit `408bbbc` ("Drop phone from contact, add mail
command...") deliberately removed it from every consumer: `dataContact` in
`js/commands.js:274-277` destructures only `email, linkedin, linkedinUrl,
github, githubUrl`; `cmdContact` (`js/commands.js:262-272`) never prints it;
`renderPlainFallback`'s `contactList` (`js/main.js:150-161`) never reads it.
Confirmed via `grep -rn "contact.phone\|\.phone" js/` — zero matches outside
`content.js` itself.

**Step 6 target** — `css/effects.css:26-38`:
```css
/* Off on small/low-power screens where the overlay repaint cost isn't worth it,
   and off whenever the user has asked for reduced motion. */
@media (max-width: 640px), (prefers-reduced-motion: reduce) {
  .terminal::before {
    display: none;
  }
  ...
}
```
The comment says "low-power screens" but the query is a pure viewport-width
check — it can't actually detect device power, only screen width. Functions
correctly as a mobile-width proxy (the actual behavior is fine and intended);
the comment overclaims a capability CSS doesn't have. Documentation-accuracy
fix only, no behavior change.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Syntax check | `for f in js/commands.js js/mailform.js js/terminal.js js/main.js; do node --check "$f" || exit 1; done` | exit 0 |
| Manual verify | `python3 -m http.server 8420` then open `http://localhost:8420` | site loads, no console errors |

If Plan 001 has already landed, also run `node --test test/` after Step 1 —
see that plan's Maintenance notes for the one assertion that needs updating.

## Scope

**In scope** (the only files you should modify):
- `js/commands.js` — `extractOutputFlag` only (Step 1)
- `js/mailform.js` — the `mailto` template literal only (Step 2)
- `js/main.js` — the `el()` helper only (Step 3)
- `js/terminal.js` — `escapeHtml()` only (Step 4)
- `js/content.js` — delete the `phone` field only (Step 5)
- `css/effects.css` — the comment above the media query only (Step 6)

**Out of scope**:
- Do not touch `resume.pdf` or any resume-content field other than `phone`.
- Do not change the `@media` query's actual breakpoint value or condition in
  Step 6 — only the comment wording.
- Do not add phone back anywhere, including the plain-text fallback — its
  removal was a deliberate prior decision (commit `408bbbc`), not an
  oversight this plan is fixing.

## Git workflow

- Branch: `advisor/002-quick-fixes`
- One commit per step is fine, or a single commit for all six given the
  total diff is under ~15 lines — either is acceptable for a bundle this
  small.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Fix `extractOutputFlag` swallowing a trailing bare `-o`

In `js/commands.js`, change the loop so a trailing flag-with-no-value is
detected and reported, rather than silently treated as a positional arg.
Simplest shape: after the loop, if the original args contained a trailing
`-o`/`--output` that was never consumed (i.e. it's the last element and
`format` is still `null`), return an explicit signal the caller can turn
into an error. Concretely, change the function to also return an `error`
field:

```js
function extractOutputFlag(args) {
  const rest = [];
  let format = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "-o" || args[i] === "--output") {
      if (i + 1 >= args.length) {
        return { format: null, rest, error: `${args[i]} requires a value (json or yaml)` };
      }
      format = args[i + 1].toLowerCase();
      i++;
    } else {
      rest.push(args[i]);
    }
  }
  return { format, rest, error: null };
}
```

Then in `dispatchNamed` (`js/commands.js:363-395`), right after
`const { format, rest } = extractOutputFlag(args);`, add:

```js
const { format, rest, error } = extractOutputFlag(args);
if (error) return [text(error, "error")];
```

(Use this single-call form — don't call `extractOutputFlag` twice.)

**Verify**: manually run the dev server, type `projects -o` in the terminal
→ expect `-o requires a value (json or yaml)`, not `no such project '-o'`.
Also confirm `projects -o json` (valid, value present) still works
unaffected: full JSON list of projects.

### Step 2: Encode `toEmail` in the mailto builder

In `js/mailform.js:37`, wrap `toEmail` in `encodeURIComponent()` to match
`subject`/`body`:

```js
const mailto = `mailto:${encodeURIComponent(toEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
```

**Verify**: dev server, run `mail`, fill the form, submit — confirm the mail
client still opens with the correct `To:` address
(`as.anandsumit@gmail.com`) and the subject/body remain unchanged from
before this fix (since the current email address has no characters that
`encodeURIComponent` would alter, this should be a no-op visually).

### Step 3: Don't force `target="_blank"` on `mailto:` links in the plain-text fallback

In `js/main.js`'s `el()` helper (lines 135-145), only set `target`/`rel` for
`http`/`https` hrefs:

```js
const el = (tag, opts = {}, children = []) => {
  const node = document.createElement(tag);
  if (opts.text) node.textContent = opts.text;
  if (opts.href) {
    node.href = opts.href;
    if (/^https?:\/\//.test(opts.href)) {
      node.rel = "noopener noreferrer";
      node.target = "_blank";
    }
  }
  for (const child of children) node.appendChild(child);
  return node;
};
```

**Verify**: dev server, navigate to `#plain-resume` (click the skip link),
inspect the email `<a>` tag in devtools — confirm it has `href="mailto:..."`
with no `target`/`rel` attributes, while the LinkedIn/GitHub/resume.pdf links
in the same list still have `target="_blank" rel="noopener noreferrer"`.

### Step 4: Escape single quotes in `escapeHtml()`

In `js/terminal.js:107-113`, add one more `.replace()` to the chain:

```js
export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
```

**Verify**: dev server, run `certs` and `contact` — confirm links still
render and are still clickable (visual regression check; the fix doesn't
change output for any current data since no content field contains a
literal `'`).

### Step 5: Delete the dead `phone` field

In `js/content.js`, remove line 14 (`phone: "(+91)-9156011787",`) from the
`contact` object.

**Verify**: `grep -rn "phone" js/` → zero matches anywhere in the repo. Dev
server, run `contact` and `contact -o json` — confirm output is unchanged
(phone was never displayed to begin with, so removing the field changes
nothing visible).

### Step 6: Fix the CRT-effect comment

In `css/effects.css`, reword the comment above the media query (around line
26) from:

```css
/* Off on small/low-power screens where the overlay repaint cost isn't worth it,
   and off whenever the user has asked for reduced motion. */
```

to:

```css
/* Off on narrow viewports (a rough proxy for likely-mobile/lower-power
   devices — max-width can't actually detect device power), and off
   whenever reduced motion is requested. */
```

**Verify**: `git diff css/effects.css` shows only the comment text changed,
no selector/property changes.

### Step 6 (optional, from `plans/README.md`'s "Findings considered and rejected" — SECURITY-02)

If doing this bundle anyway, add defense-in-depth against mailto header
injection: in `js/mailform.js`'s submit handler, strip `\r`/`\n` from
`from`/`subject` before building `body`/`mailto` (they're meant to be
single-line fields):

```js
const from = form.elements.from.value.trim().replace(/[\r\n]/g, " ");
const subject = form.elements.subject.value.trim().replace(/[\r\n]/g, " ");
```

This is optional — skip it if you want to keep this plan strictly to the six
numbered steps above; it's noted here because it's a free two-line addition
while already in this file.

## Test plan

No new automated tests in this plan (that's Plan 001's job) — verification
is the manual per-step checks above, plus:
- If Plan 001 has already landed: `node --test test/` → all pass, EXCEPT you
  must first update the `extractOutputFlag(["foo", "-o"])` test case in
  `test/commands.test.js` to assert the new error-returning behavior instead
  of the old silent-swallow behavior (see Plan 001's Maintenance notes).

## Done criteria

- [ ] `projects -o` (no value) shows a clear "-o requires a value" error, not "no such project '-o'"
- [ ] `js/mailform.js:37` wraps `toEmail` in `encodeURIComponent`
- [ ] Plain-fallback mailto link has no `target`/`rel`; http(s) links still do
- [ ] `js/terminal.js`'s `escapeHtml` has 5 `.replace()` calls (added `'`)
- [ ] `grep -n "phone" js/content.js` → no matches
- [ ] `css/effects.css`'s comment no longer says "low-power screens"
- [ ] `for f in js/commands.js js/mailform.js js/terminal.js js/main.js; do node --check "$f"; done` all exit 0
- [ ] No files outside the Scope list modified (`git status`)
- [ ] Status row for Plan 002 updated in `plans/README.md`

## STOP conditions

- Any "Current state" excerpt above doesn't match the live code.
- Fixing Step 1 seems to require changing `dispatchNamed`'s overall
  control-flow shape beyond adding the one `if (error)` early-return shown —
  if the actual code structure has diverged enough that this doesn't fit
  cleanly, stop and report rather than restructuring further.
- A verification step fails twice after a reasonable fix attempt.

## Maintenance notes

- If Plan 001 hasn't landed yet when this plan runs, no test file needs
  updating for Step 1. If Plan 001 already landed, update the noted test
  case (see Plan 001 Maintenance notes) as part of this plan's Step 1 commit.
- Step 5 (deleting `phone`) is a one-way content decision already made by a
  prior commit — this plan just finishes cleaning it up, not re-opening it.
