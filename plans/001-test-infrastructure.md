# Plan 001: Add zero-dependency test infrastructure and initial coverage

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in "STOP conditions" occurs, stop and report — do
> not improvise. When done, update this plan's status row in `plans/README.md`
> unless a reviewer dispatched you and told you they maintain it.
>
> **Drift check (run first)**: `git diff --stat f9c3ee4..HEAD -- js/yaml.js js/commands.js js/history.js`
> If any of these changed since this plan was written, compare the "Current
> state" excerpts below against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `f9c3ee4`, 2026-08-09

## Why this matters

There is no automated way to know this codebase works — no test files, no
`package.json`/test runner, no CI. Every edit is verified only by manually
loading the page in a browser. This matters more than usual here: the git
history shows all 12 commits landed the same day in what reads as an AI-agent
pairing session, and this repo will keep being edited by agents going
forward. `js/yaml.js`'s `toYaml()` is the single most naturally-testable
function in the repo (pure, no DOM, real edge-case logic in its quoting
regex) and has zero coverage; `js/commands.js`'s dispatcher and pure helpers
are exercised by every command a visitor runs and also have zero coverage.
This plan establishes the verification baseline and the first real tests,
including two small correctness gaps the act of writing tests would surface
directly (a dormant YAML-quoting bug and an unenforced alias-uniqueness
invariant).

## Current state

- `js/yaml.js` (58 lines) — hand-rolled YAML dumper, the `-o yaml` output
  flag's implementation. Pure function, zero DOM dependency.

  ```js
  // js/yaml.js:5-14
  function needsQuoting(str) {
    return (
      str === "" ||
      /^\s|\s$/.test(str) ||
      /: |:$/.test(str) ||
      /\s#/.test(str) ||
      /^[-?:,[\]{}&*!|>'"%@`]/.test(str) ||
      /\n/.test(str)
    );
  }
  ```

  This never checks whether a string *looks like* a YAML number, boolean, or
  null (`"2023"`, `"true"`, `"no"`, `"~"`). No field in the live
  `js/content.js` currently triggers this (verified by reading the full
  file), so it's dormant, not actively broken — but a future content field
  that happens to look numeric/reserved would silently round-trip as the
  wrong type through `-o yaml`. Fix as part of this plan's test-writing (see
  Step 2).

  ```js
  // js/yaml.js:24-38 — the recursive dumper, array-of-objects branch
  export function toYaml(value, indent = 0) {
    const pad = "  ".repeat(indent);
    if (Array.isArray(value)) {
      if (value.length === 0) return `${pad}[]`;
      return value
        .map((item) => {
          if (item !== null && typeof item === "object") {
            const nested = toYaml(item, indent + 1);
            return nested.replace(new RegExp(`^${pad}  `), `${pad}- `);
          }
          return `${pad}- ${scalar(item)}`;
        })
        .join("\n");
    }
    // ... object branch below, similar shape
  ```

  The array-of-objects case does structural work via a regex substitution
  (replacing the first nested line's leading indent with a `- ` marker) —
  exactly the kind of thing that looks right by eye and breaks on an
  untested edge case.

- `js/commands.js` (415 lines) — command registry, parser, dispatcher. Pure,
  DOM-free functions worth testing directly:

  ```js
  // js/commands.js:68-79
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

  ```js
  // js/commands.js:44-56
  function colWidths(rows, count) { /* ... */ }
  function padCols(cells, widths) { /* ... */ }
  ```

  ```js
  // js/commands.js:355-361
  function resolveCommand(name) {
    if (COMMANDS[name]) return name;
    for (const [key, def] of Object.entries(COMMANDS)) {
      if (def.aliases.includes(name)) return key;
    }
    return null;
  }
  ```

  `resolveCommand` has no uniqueness check across the `COMMANDS` registry's
  alias lists — currently no collision exists (verified: `whoami`, `exp`,
  `edu`, `certifications`, `email`, `cls`, `neofetch` are all distinct), but
  nothing would catch a future duplicate; the earlier-defined command would
  silently win and the later one's alias would become unreachable. Add a
  startup assertion as part of this plan (Step 3).

  `extractOutputFlag`, `colWidths`, `padCols`, `resolveCommand` take no `ctx`
  and are directly callable. `dispatch`/`dispatchNamed` (`js/commands.js:363-402`)
  need only a minimal mock `ctx` (`{ content, escapeHtml }`) to exercise full
  command routing including the `-o json`/`-o yaml` error paths:

  ```js
  // js/commands.js:374-388 — the branches to cover
  if (format) {
    if (!def.data) {
      return [text(`${name}: -o is not supported for this command`, "error")];
    }
    if (format !== "json" && format !== "yaml") {
      return [text(`${name}: unsupported output format '${format}' (use json or yaml)`, "error")];
    }
    try {
      const value = def.data(rest, ctx);
      const serialized = format === "json" ? JSON.stringify(value, null, 2) : toYaml(value);
      return serialized.split("\n").map((line) => text(line));
    } catch (err) {
      return [text(err.message, "error")];
    }
  }
  ```

- `js/history.js` (40 lines) — command history buffer, fully DOM-free:

  ```js
  // js/history.js:8-14
  export function push(line) {
    const trimmed = line.trim();
    if (!trimmed) return;
    if (buffer[buffer.length - 1] === trimmed) return; // skip immediate repeats
    buffer.push(trimmed);
    cursor = null;
  }
  ```

  Note the dedup only catches an *immediate* repeat (compares against the
  last entry only), not all duplicates — that's existing, correct, intended
  behavior (matches real shell history semantics); just be aware of it when
  writing test cases so you assert the actual contract, not a stronger one.

- No `package.json` exists anywhere in the repo, and per `README.md` that's
  deliberate ("No framework, no build step"). This plan must not introduce
  the project's first `package.json`/`node_modules` — use Node's built-in
  `node:test` + `node:assert` runner instead (ships in Node 18+; confirmed
  working via `node --check` during the audit on the machine this was
  planned on). This keeps the deployed site's zero-dependency property
  completely untouched — these tests never ship, they're a local/CI-only dev
  tool.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Syntax check all JS | `for f in js/*.js; do node --check "$f" || exit 1; done` | exit 0, no output |
| Run tests | `node --test test/` | all tests pass, summary shows 0 fail |

No install step — `node:test` and `node:assert` are Node built-ins, nothing
to `npm install`.

## Scope

**In scope** (the only files you should create or modify):
- `test/yaml.test.js` (create)
- `test/commands.test.js` (create)
- `test/history.test.js` (create)
- `js/yaml.js` — extend `needsQuoting()` only (Step 2)
- `js/commands.js` — add one alias-uniqueness assertion only (Step 3); do
  **not** otherwise restructure this file (that's Plan 006, separately)
- `README.md` — add a one-line "Tests" mention pointing at `node --test test/`

**Out of scope** (do NOT touch, even though related):
- Any DOM-coupled module (`terminal.js`, `main.js`, `boot.js`, `mailform.js`,
  `neofetch.js`) — these need a DOM environment (jsdom or a real browser) to
  test meaningfully, which is a bigger, separate decision this plan
  deliberately doesn't make. Leave them untested for now.
- Do not add a `package.json`. If you find yourself needing one (e.g. to add
  a `"type": "module"` field because `node --test` can't resolve ESM
  imports), STOP and report — see STOP conditions.
- Do not touch `js/theme.js`'s `localStorage` usage or any other DOM-coupled
  code.

## Git workflow

- Branch: `advisor/001-test-infrastructure`
- Commit per step (4 commits: yaml tests + fix, commands tests + fix, history
  tests, README mention)
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Set up the test directory and confirm `node:test` works on this repo's ESM modules

Create `test/yaml.test.js` with a single trivial smoke test first, to confirm
Node can import the site's ES modules directly:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { toYaml } from "../js/yaml.js";

test("toYaml: smoke test", () => {
  assert.equal(toYaml("hello"), "hello");
});
```

**Verify**: `node --test test/` → 1 test, 1 pass. If this fails with an ESM
resolution error, see STOP conditions below (do not work around it by adding
a `package.json` without stopping to report first — that's a bigger decision
than this step).

### Step 2: Full `toYaml()` coverage, plus the numeric/reserved-word quoting fix

Extend `test/yaml.test.js` with cases for:
- Empty string → quoted (`""`)
- String with leading/trailing whitespace → quoted
- String containing `": "` or ending in `":"` → quoted
- String starting with a YAML-special char (`-`, `?`, `:`, `,`, `[`, `]`,
  `{`, `}`, `&`, `*`, `!`, `|`, `>`, `'`, `"`, `%`, `@`, `` ` ``) → quoted
- String containing a newline → quoted
- Plain string with none of the above → NOT quoted
- **New case (drives the fix)**: strings `"2023"`, `"true"`, `"false"`,
  `"null"`, `"yes"`, `"no"`, `"~"` → currently unquoted (assert this fails /
  document the gap first), then after the fix below, assert they ARE quoted
- Nested array of objects (feed it a real entry from `js/content.js`'s
  `experience` array) → assert the exact multi-line output string, including
  the `- ` prefix only on the first line of each nested block
- Empty array / empty object → `[]` / `{}`

Then fix `js/yaml.js:5-14`'s `needsQuoting()` by adding one more `||`
branch:

```js
/^(-?\d+(\.\d+)?|true|false|null|yes|no|on|off|~)$/i.test(str)
```

(case-insensitive YAML core-schema scalar check, matching the existing
regex-array style already used in the function)

**Verify**: `node --test test/yaml.test.js` → all pass, including the new
numeric/reserved-word cases.

### Step 3: `commands.js` dispatcher/helper coverage, plus the alias-uniqueness assertion

Create `test/commands.test.js`. You'll need a mock `ctx`:

```js
const mockCtx = {
  content: { /* minimal shape matching js/content.js's real structure —
                copy the actual shape from js/content.js, don't invent a
                different one, so tests stay representative */ },
  escapeHtml: (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;"),
};
```

Note `extractOutputFlag`, `colWidths`, `padCols`, `resolveCommand` are not
currently exported from `js/commands.js` (they're module-private). Add
`export` to each of these four function declarations only — no logic
changes, no renames. `dispatch` and `completions` are already exported.

Test cases:
- `extractOutputFlag(["-o", "json", "foo"])` → `{format: "json", rest: ["foo"]}`
- `extractOutputFlag(["foo", "-o", "json"])` → `{format: "json", rest: ["foo"]}`
- `extractOutputFlag(["foo", "bar"])` → `{format: null, rest: ["foo", "bar"]}`
- `extractOutputFlag(["foo", "-o"])` (trailing flag, no value) → current
  (buggy, see Plan 002 Step 1) behavior is `{format: null, rest: ["foo", "-o"]}`
  — write the test to assert *today's actual* behavior here; Plan 002 fixes
  the bug and that plan should update this specific assertion when it lands
  (note this cross-plan dependency in this test's comment)
- `resolveCommand("about")` → `"about"`; `resolveCommand("whoami")` → `"about"`;
  `resolveCommand("nonexistent")` → `null`
- `dispatch("skills -o json", mockCtx)` → returns blocks whose joined text is
  valid JSON matching `mockCtx.content.skills`
- `dispatch("resume -o json", mockCtx)` → single error block,
  `"resume: -o is not supported for this command"`
- `dispatch("skills -o xml", mockCtx)` → single error block,
  `"skills: unsupported output format 'xml' (use json or yaml)"`

Then add the alias-uniqueness assertion. In `js/commands.js`, after the
`COMMANDS` export (around line 353), add:

```js
// Fail loudly at load time if two commands ever claim the same alias —
// otherwise the earlier-defined one silently wins and the later alias
// becomes unreachable with no error.
{
  const seen = new Map();
  for (const [key, def] of Object.entries(COMMANDS)) {
    for (const alias of def.aliases) {
      if (seen.has(alias)) {
        throw new Error(`Duplicate command alias "${alias}": claimed by both "${seen.get(alias)}" and "${key}"`);
      }
      seen.set(alias, key);
    }
  }
}
```

Add a test that temporarily constructs a small colliding registry object
(not the real `COMMANDS`) and asserts the same uniqueness logic throws —
don't mutate the real `COMMANDS` object in a test.

**Verify**: `node --test test/commands.test.js` → all pass. Then
`node --check js/commands.js` → exit 0 (confirms the new startup assertion
block doesn't break module load with the real, currently-collision-free
registry).

### Step 4: `history.js` coverage

Create `test/history.test.js`. `push`/`prev`/`next`/`reset` are already
exported. Cases:
- Push then `prev("")` → returns the pushed line
- Push same line twice in a row → second push is a no-op (buffer length
  stays 1)
- Push two different lines, `prev("")` twice → returns them newest-first
- `prev` past the oldest entry → clamps, doesn't error or wrap
- Start typing a draft, press `prev`, then `next` back past the newest entry
  → returns the original draft, not an empty string
- `reset()` clears cursor/draft (verify via a subsequent `prev`/`next` call
  behaving as if fresh)

**Verify**: `node --test test/history.test.js` → all pass.

### Step 5: Document how to run tests

Add a short "## Tests" section to `README.md`, after "## Deploy":

```markdown
## Tests

Pure-logic modules (`js/yaml.js`, the exported helpers in `js/commands.js`,
`js/history.js`) have test coverage under `test/`, using Node's built-in test
runner — no install needed:

    node --test test/

DOM-coupled modules (terminal.js, main.js, boot.js, mailform.js, neofetch.js)
are not covered — verify those by loading the page in a browser (see "Run
locally" above).
```

**Verify**: re-read the added section, confirm the command in it matches
Step 1-4's actual verify commands exactly.

## Test plan

Already detailed per-step above. Full suite verification:
`node --test test/` → all tests across `yaml.test.js`, `commands.test.js`,
`history.test.js` pass, 0 failures.

## Done criteria

- [ ] `node --test test/` exits 0, all tests pass
- [ ] `for f in js/*.js; do node --check "$f" || exit 1; done` exits 0
- [ ] `test/yaml.test.js`, `test/commands.test.js`, `test/history.test.js` all exist and are non-empty
- [ ] `grep -n "needsQuoting" js/yaml.js` shows the new numeric/reserved-word branch
- [ ] `grep -n "Duplicate command alias" js/commands.js` shows the new assertion
- [ ] No `package.json` was created (`ls package.json` → "No such file")
- [ ] No files outside the Scope list were modified (`git status`)
- [ ] Status row for Plan 001 updated in `plans/README.md`

## STOP conditions

Stop and report back (do not improvise) if:
- The code at any "Current state" citation above doesn't match what's in the
  repo (drift since this plan was written).
- `node --test` cannot resolve the site's ES module imports (`import ... from
  "../js/yaml.js"` failing) in a way that seems to require a `package.json`
  with `"type": "module"` to fix — this is a real decision (first-ever
  manifest file) that shouldn't be made silently mid-step.
- Any test for *current* behavior (e.g. the `extractOutputFlag` trailing-flag
  case in Step 3) seems to require changing production code to pass — that
  specific case is testing today's (buggy) behavior on purpose; changing it
  is Plan 002's job, not this plan's.
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

- Plan 002 fixes the `extractOutputFlag` trailing-`-o` bug this plan
  deliberately tests as *current* behavior — when Plan 002 lands, the
  specific assertion in Step 3 for `extractOutputFlag(["foo", "-o"])` needs
  updating to the new, correct behavior (an error block), and its comment
  should be removed.
- Plan 006 (optional, `commands.js` split) should be done after this plan —
  the new `export`s added in Step 3 and the exported `dispatch`/`completions`
  need to move together if that split happens, and having tests in place
  first makes that refactor much safer to verify.
- If DOM-coupled testing (terminal.js, main.js, etc.) is ever wanted later,
  that's a bigger decision (jsdom vs. Playwright vs. a manual browser
  checklist) — deliberately out of scope here, flag it as a future plan
  rather than scope-creeping into this one.
