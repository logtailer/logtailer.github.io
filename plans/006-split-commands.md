# Plan 006 (optional): Split commands.js into format/dispatch/handlers

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in "STOP conditions" occurs, stop and report — do
> not improvise. When done, update this plan's status row in `plans/README.md`.
>
> **This plan is optional / lower-confidence** — flagged during the audit as
> a judgment call (415 lines is still a one-sitting read; splitting adds
> import surface to a codebase whose explicit goal is a small, flat file
> count). Proceed only if the operator has confirmed they want this done.
>
> **Drift check (run first)**: `git diff --stat f9c3ee4..HEAD -- js/commands.js`
> If it changed since this plan was written, compare against the excerpt
> below before proceeding; on a mismatch, treat it as a STOP condition.
>
> **Strongly prefer running this after Plan 001** — splitting is much safer
> with `dispatch`/`resolveCommand`/`extractOutputFlag` tests already in place
> to catch a broken import or dropped export during the move. If Plan 001's
> status (in `plans/README.md`) is not DONE, STOP and report rather than
> proceeding without a safety net.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: MED
- **Depends on**: 001
- **Category**: tech-debt
- **Planned at**: commit `f9c3ee4`, 2026-08-09

## Why this matters

`js/commands.js` (415 lines) is the largest file in the repo and the
joint-highest-churn file (7 of 12 commits touched it, tied with
`css/terminal.css`). It currently mixes four distinct concerns: generic
formatting primitives (`text`/`html`/`blank`/`heading`/`row`/`head`/
`colWidths`/`padCols`/`columnize`/`extractOutputFlag`/`isNarrow`, if Plan 005
hasn't moved that last one to `viewport.js` yet), the `FILES` alias table,
~15 command handler + data-accessor function pairs, the `COMMANDS` registry,
and the parser/dispatcher (`resolveCommand`/`dispatchNamed`/`dispatch`/
`completions`). Every new command or formatting tweak currently touches the
same file as the dispatcher/registry logic, with no structural boundary
between them — plausibly why this is the most-changed file. Not yet painful
at 415 lines, but it's the clearest "next to outgrow itself" file in the
repo.

## Current state

Full structural breakdown of `js/commands.js` as it exists today (line
ranges will shift if Plan 002 and/or Plan 005 landed first — re-read the
live file and adjust before starting, per the drift check above):

- Lines 1-18: imports, `FILES` alias table
- Lines 20-90ish: formatting primitives (`text`, `html`, `blank`, `heading`,
  `subheading`, `row`, `head`, `colWidths`, `padCols`, `isNarrow` (or import
  from `viewport.js` if Plan 005 landed), `extractOutputFlag`, `columnize`)
- Lines ~92-334: command handlers and their paired `data*` functions
  (`cmdHelp`, `cmdAbout`/`dataAbout`, `cmdExperience`/`dataExperience`,
  `cmdEducation`/`dataEducation`, `cmdSkills`/`dataSkills`, `cmdCerts`/
  `dataCerts`, `cmdProjects`/`dataProjects`, `cmdContact`/`dataContact`,
  `cmdMail`, `cmdResume`, `cmdClear`, `cmdBanner`, `cmdLs`, `cmdCat`,
  `cmdTheme`, `cmdSudo`)
- Lines ~336-353: `COMMANDS` registry (exported)
- Lines ~355-415: `resolveCommand`, `dispatchNamed`, `dispatch` (exported),
  `completions` (exported)

Imports at the top of the current file:
```js
import { buildNeofetchBlocks } from "./neofetch.js";
import { toYaml } from "./yaml.js";
import { THEMES } from "./theme.js";
```

Modules that import *from* `commands.js`: `js/main.js` does
`import { dispatch, completions } from "./commands.js";` — this is the only
external consumer and only needs those two exports; nothing else imports
from `commands.js`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Syntax check | `for f in js/*.js; do node --check "$f" || exit 1; done` | exit 0 |
| Tests (from Plan 001) | `node --test test/` | all pass — this is your primary safety net for this refactor |
| Manual verify | `python3 -m http.server 8420`, exercise every command | all commands still work identically |

## Scope

**In scope**:
- `js/commands.js` — split into three files (see Step 1)
- `js/format.js` (create)
- New file for handlers, e.g. `js/command-handlers.js`, OR keep handlers in
  `commands.js` and only extract `format.js` — see Step 1 for the decision
  this plan asks you to make explicitly, not assume
- `js/main.js` — only if its import statement needs updating (it shouldn't,
  if `dispatch`/`completions` stay exported from wherever `commands.js`'s
  successor file ends up)
- `test/commands.test.js` (from Plan 001, if it exists) — update any import
  paths that moved

**Out of scope**:
- Do not change any command's behavior, output, or the `COMMANDS` registry's
  contents — this is a pure structural move, zero behavior change.
- Do not touch `js/theme.js`, `js/neofetch.js`, `js/yaml.js` beyond what's
  needed to keep their existing imports/exports working.

## Git workflow

- Branch: `advisor/006-split-commands`
- Commit per extracted module (e.g. one commit moving `format.js` out, one
  commit moving the dispatcher out if you choose that split), so each commit
  is independently revertable if something breaks.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Decide the split boundary, and default to the smallest safe cut

Re-read the live `js/commands.js` first (line numbers above are approximate
and will have shifted). Recommended minimal split — extract *only* the
formatting primitives, leave everything else (handlers, registry, dispatcher)
together in `commands.js`:

Create `js/format.js` containing: `text`, `html`, `blank`, `heading`,
`subheading`, `row`, `head`, `colWidths`, `padCols`, `columnize` (and
`isNarrow`/`extractOutputFlag` only if Plan 005 hasn't already moved
`isNarrow` to `viewport.js` — `extractOutputFlag` stays here regardless).
Export every one of these functions. In `commands.js`, replace their
definitions with:

```js
import { text, html, blank, heading, subheading, row, head, colWidths, padCols, columnize, extractOutputFlag } from "./format.js";
```

(adjust the import list to match whichever functions actually moved).

This alone addresses the core finding (formatting helpers separated from
registry/dispatch logic) with the lowest risk — a further split of handlers
vs. registry vs. dispatcher into additional files is a larger, higher-risk
move for marginal additional benefit at this repo's size. **Do the
`format.js` extraction only, unless the operator has explicitly asked for a
deeper split** — if they have, STOP and report back to get an explicit go-
ahead on the larger scope before proceeding, since it's a materially bigger
change than what this plan defaults to.

**Verify**: `node --check js/format.js js/commands.js` → both exit 0.

### Step 2: Fix every call site

`js/commands.js` still needs every function it uses from `format.js`
imported. Go through the file top to bottom and confirm every reference to
`text(`, `html(`, `blank(`, `heading(`, `subheading(`, `row(`, `head(`,
`colWidths(`, `padCols(`, `columnize(`, `extractOutputFlag(` resolves via
the new import, not a now-deleted local definition.

**Verify**: `node --check js/commands.js` → exit 0 (a missing import would
surface as a runtime `ReferenceError`, not a syntax error, so this check
alone isn't sufficient — proceed to Step 3's test run before trusting this).

### Step 3: Run the full test suite and manual check

`node --test test/` (if Plan 001 landed) → all pass, zero failures. If any
test fails, it's almost certainly a missed import from Step 2 — fix and
re-run, don't proceed to manual verification with failing tests.

Then manually exercise every command in a browser (`help`, `about`,
`experience`, `education`, `skills`, `certs`, `projects`,
`projects <slug>`, `contact`, `mail`, `resume`, `clear`, `banner`,
`neofetch`, `theme`, `ls`, `cat <file>`, `sudo <anything>`, plus `-o json`
and `-o yaml` on every data command) and confirm output is byte-identical to
before this refactor.

**Verify**: full manual command sweep above, zero regressions. `git status`
shows only the files in Scope changed.

## Test plan

Rely entirely on Plan 001's existing test suite as the regression net for
this refactor — this plan should add zero new test cases (it's not changing
behavior, so there's nothing new to test) but MUST keep every existing test
passing. If Plan 001 hasn't landed, this plan's only safety net is the
manual command sweep in Step 3 — proceed with extra care and consider
stopping to recommend Plan 001 run first instead (see the header note).

## Done criteria

- [ ] `js/format.js` exists, exports the formatting primitives listed in Step 1
- [ ] `js/commands.js` imports them rather than defining them locally
- [ ] `node --test test/` passes (if Plan 001 landed) with zero changes to
      test file contents beyond import-path fixes
- [ ] Full manual command sweep (Step 3) shows zero output differences
- [ ] `for f in js/*.js; do node --check "$f"; done` all exit 0
- [ ] No files outside Scope modified (`git status`)
- [ ] Status row for Plan 006 updated in `plans/README.md`

## STOP conditions

- Plan 001 is not DONE — stop and report, recommend it run first.
- The operator wants a deeper split than the `format.js`-only extraction —
  stop and get explicit confirmation on the larger scope (see Step 1).
- Any test failure persists after two fix attempts.
- Manual verification finds ANY output difference, however minor — this
  plan promises zero behavior change; if that promise can't be kept
  cleanly, stop and report rather than shipping a subtle regression.

## Maintenance notes

- If this plan's minimal split (format.js only) is later followed by a
  deeper split (handlers/registry/dispatcher into separate files), that's a
  new plan, not a continuation of this one — re-run `/improve` or write a
  fresh plan for it, don't retroactively expand this plan's scope.
- `js/main.js`'s import (`import { dispatch, completions } from
  "./commands.js";`) should not need to change as long as `commands.js`
  keeps re-exporting or directly exporting both — confirm this stays true
  post-split.
