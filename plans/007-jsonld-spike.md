# Plan 007 (optional, spike): Design schema.org JSON-LD for resume data

> **Executor instructions**: This is a design/investigation spike, not a
> build-everything plan — the deliverable is a decision plus a small,
> reversible implementation if the spike concludes it's worth shipping, not
> a large feature build. Follow the steps, and stop after Step 3 to report
> findings if the answer to "is this worth shipping" isn't a clear yes.
>
> **Drift check (run first)**: `git diff --stat f9c3ee4..HEAD -- js/content.js index.html`

## Status

- **Priority**: P3
- **Effort**: M (spike-scoped — investigation + a small reversible change,
  not a full feature build)
- **Risk**: LOW
- **Depends on**: none (independent of Plan 003, though both touch
  `index.html`'s `<head>` — do Plan 003 first if both are in flight, to
  avoid a merge conflict on the same region of the file)
- **Category**: direction
- **Planned at**: commit `f9c3ee4`, 2026-08-09

## Why this matters

`js/content.js` already holds a complete, structured representation of a
person's resume — name/title, contact info, education, experience, skills,
certifications with verification URLs. None of it is exposed as structured
data (`schema.org/Person` JSON-LD) in `index.html`, which is what lets
Google's rich-results/knowledge-panel features and LinkedIn/recruiter-facing
tooling parse the page as "a person," not generic text. This is genuinely
grounded in the site's stated purpose (a job-seeking portfolio meant to be
found by recruiters) and in data that already exists — but whether it
actually moves the needle for a single-page personal site is a judgment
call, which is why this is scoped as a spike: investigate and produce a
small reversible change, not commit to a big feature.

## Current state

`js/content.js` (full file) has this shape:
```js
export const content = {
  meta: { name, title, promptUser, promptHost, yearsExperience },
  contact: { email, linkedin, linkedinUrl, github, githubUrl }, // phone removed by Plan 002
  summary: "...",
  education: [{ degree, school, period }, ...],
  experience: [{ company, role, period, bullets: [...] }, ...],
  skills: { core: [...], observability: [...], platform: [...] },
  certifications: [{ name, date, url }, ...],
  projects: [{ slug, name, tagline, details: [...] }, ...],
};
```

`js/commands.js` already has `dataAbout`, `dataContact`, `dataExperience`,
`dataEducation`, `dataCerts` functions (used by the `-o json`/`-o yaml`
flag) that shape this same data for external consumption — reuse these
rather than writing a second, parallel data-shaping layer, so the JSON-LD
block can't drift from what `-o json` already reports.

`index.html`'s `<head>` currently has no `<script type="application/ld+json">`
block (confirmed absent).

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Manual verify | Google's Rich Results Test (`search.google.com/test/rich-results`) — paste the page URL or raw HTML once deployed, or validate the JSON-LD block's syntax with `node -e "JSON.parse(require('fs').readFileSync('...', 'utf8'))"` against the extracted block locally | no syntax errors, `Person` type recognized |

## Scope

**In scope**:
- Investigation (Steps 1-2): read-only, no file changes
- `index.html` — one new `<script type="application/ld+json">` block in
  `<head>` (Step 3, only if the spike concludes it's worth shipping)

**Out of scope**:
- Do not add a build step to generate the JSON-LD dynamically — hand-author
  it as a static block, matching the rest of the site's architecture, OR (if
  you want it sourced from `content.js` to avoid drift) write it as an
  inline `<script>` at the bottom of `index.html` that reads `content.js`'s
  exported object at page-load time and injects the JSON-LD block via JS —
  either approach is acceptable; pick one and justify it in your report
  since this is a real design decision, not something to default silently.
- Do not publish anything not already public elsewhere on the site (e.g. no
  raw phone number — already removed per Plan 002; no data beyond what
  `contact`/`experience`/`education`/`certs` commands already show a
  visitor).

## Git workflow

- Branch: `advisor/007-jsonld-spike`
- If Step 3 ships something: one commit.
- If the spike concludes "not worth it": no code commit needed — just report
  findings (see below).
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Map `content.js` fields to `schema.org/Person`

Produce (as your report, not necessarily a file) a field mapping:
- `content.meta.name` → `Person.name`
- `content.meta.title` → `Person.jobTitle`
- `content.contact.email` → `Person.email`
- `content.contact.linkedinUrl`, `content.contact.githubUrl` →
  `Person.sameAs` (array)
- `content.education[]` → `Person.alumniOf` (array of
  `EducationalOrganization` or `CollegeOrUniversity`)
- `content.experience[]` (most recent entry, or all) → `Person.worksFor`
  and/or `Person.hasOccupation`
- `content.summary` → `Person.description`

Note explicitly where the mapping is ambiguous or lossy (e.g. `worksFor`
expects one current employer — decide whether to model past roles via
`alumniOf`-adjacent properties or omit them; schema.org's guidance on this is
genuinely underspecified for a multi-role work history, so don't force a
clean answer if there isn't one — report the ambiguity).

### Step 2: Validate the mapping against Google's structured-data guidelines

Check Google's `Person` structured-data documentation (or general
schema.org/Person docs if offline) for which properties Google's rich
results actually consume vs. which are schema.org-valid but ignored by
search engines in practice. Note this distinction in your report — don't
just produce a technically-valid-but-practically-inert block.

### Step 3: If the mapping is clean and the value case is clear, implement a minimal version

Only proceed to implementation if Steps 1-2 produced a confident "yes, this
is worth doing" — if the mapping felt forced or the value is unclear, STOP
here and report the investigation findings instead (this is a valid, useful
outcome for a spike — "not worth it, here's why" is a real deliverable).

If implementing, add to `index.html`'s `<head>`:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "...",
  "jobTitle": "...",
  "email": "...",
  "sameAs": ["...", "..."],
  "description": "..."
}
</script>
```

Populated from the actual `content.js` values (hand-copy them for a static
block — simplest, matches the site's no-build-step architecture; note in
your commit message that this needs manual updating if `content.js` changes,
same tradeoff the site already accepts for `resume.pdf`).

**Verify**: extract the JSON-LD block's content and run
`node -e "JSON.parse(process.argv[1])" "$(cat block.json)"` (or paste into
any JSON validator) → no syntax errors. If possible, run the page through
Google's Rich Results Test → `Person` type recognized, no errors (warnings
about missing optional fields are fine).

## Test plan

No automated tests apply (static markup). Verification is the JSON syntax
check and, ideally, Google's Rich Results Test against the deployed page
(can't be run against localhost — note this as a follow-up manual check for
after deploy, not blocking this plan's completion).

## Done criteria

- [ ] Step 1's field mapping is documented (in your final report even if not
      shipped)
- [ ] Step 2's Google-guideline check is documented
- [ ] EITHER: a `<script type="application/ld+json">` block exists in
      `index.html`, is valid JSON, and its content matches `content.js`
      OR: a clear "not implemented, here's why" conclusion is reported
- [ ] If implemented: no other part of `index.html` changed
- [ ] Status row for Plan 007 updated in `plans/README.md` (DONE if
      shipped, REJECTED with the one-line reason if the spike concluded
      against it — both are valid outcomes per this plan's own instructions)

## STOP conditions

- The field mapping in Step 1 doesn't converge on a confident answer for
  the `worksFor`/multi-role-history ambiguity — report and stop rather than
  forcing a bad mapping into a shipped block.
- You can't access schema.org/Google's documentation to complete Step 2 —
  report this limitation rather than guessing at what search engines
  actually consume.

## Maintenance notes

- If shipped, the JSON-LD block is hand-maintained static data, same
  category of "must be updated by hand when content.js changes" as
  `resume.pdf` already is — worth a one-line mention in `AGENTS.md` (Plan
  004) if that plan lands after this one.
- Re-run Google's Rich Results Test after the site is actually deployed
  (can't validate rich-result eligibility against localhost) — this is a
  post-deploy follow-up, not something this plan can fully close out.
