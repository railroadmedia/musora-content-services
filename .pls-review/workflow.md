# pls-review workflow

Injected by the Claude Code skill (`.claude/skills/pls-review/SKILL.md`). Edit here — any other
entry point added later injects this same file, so they cannot drift apart.

Review the current change against `CODE_REVIEW.md`, present findings, wait for the developer to
choose, then apply only what they chose.

## Hard constraints

- **Never edit before approval.** Steps 1-5 are read-only. The first edit happens in step 6, after
  the developer has answered.
- **Only edit files already in the change.** Never create a file, scaffold a test, or add a new
  service or module. If a finding can only be resolved by adding a file, report it as advice and
  leave it — this reviews and adjusts, it does not author.
- **Never run the test suite.** `CLAUDE.md` forbids it unless the developer explicitly asks.
- **Every finding is evidenced** per the guideline's guardrails: a changed line, a rule ID, a
  concrete consequence. Reporting zero findings is a correct outcome.

## Steps

### 1. Resolve the target

If a target argument was given, use it: a ref or range (`HEAD~1`, `abc123..def456`), a path filter,
or `--staged`.

Otherwise, from the working tree status:

- Uncommitted changes present → review `git diff HEAD`.
- Clean tree → review `git diff main...HEAD`.
- Both empty → say there is nothing to review, and stop.

State which target you resolved before going further.

### 2. Read enough context to judge design

A design finding cannot be made from a diff hunk alone — DIP, ISP, BOUND and API calls in
particular need the whole unit and its callers. Read each changed file in full, then its direct
importers (grep for the module path).

For any changed file under `src/services/`, also check whether the change adds, renames, or removes
an `export function` — that is the package's published surface (API family), and `src/index.js` /
`src/index.d.ts` should have been regenerated in the same change.

### 3. Review

Work through the change along four axes. Run them as parallel subagents if the host supports it;
otherwise do them in sequence, one pass each:

- **SRP + OCP + NEST + GUARD** — responsibility seams, conditional growth, nesting depth, early exits.
- **LSP + ISP + DIP + BOUND** — contracts, interface width, dependency direction, layer and
  `internal/` boundaries.
- **ASYNC + TS + RN + API** — await sequencing and swallowed errors, null-safety the compiler skips
  under `strict: false`, React Native compatibility, published surface.
- **COND + SMELL + DOC** — conditional simplification, catalog smells, comment and JSDoc house rules.

The rule families overlap by design. Where two apply to the same line, keep the more specific one —
step 4 drops the duplicate.

Each pass yields candidate findings: rule ID, `file:line`, one-line consequence, proposed edit.

### 4. Verify

Re-check every candidate against the guideline's guardrails. Drop anything that:

- can't name a concrete consequence,
- isn't tied to a rule ID,
- lands on a line this change didn't touch,
- is pre-existing,
- or is something Prettier or the TypeScript compiler would catch — remembering that with
  `strict: false`, null and undefined handling is *not* one of those.

What survives is the review. If nothing survives, say so and stop — do not lower the bar to produce
output.

### 5. Present, then stop

Group by severity, numbered continuously:

```
N. [SEVERITY] RULE-ID — file.ts:42
   Consequence: <one line>
   Fix: <the specific edit>
```

Then ask which to apply — `1,3,5`, `all`, or `none`. **Do not edit anything until this is
answered.**

### 6. Apply the approved findings only

- Edit each approved finding. Nothing else.
- `npx prettier --write` on the files you touched.
- If an approved fix changed an `export function` name under `src/services/`, run
  `npm run build-index` so `src/index.js` and `src/index.d.ts` stay in sync.
- Do not run `npm test` — offer it instead, and let the developer decide.

Then report what was applied, what was skipped, and anything too large to auto-fix. A genuine SRP
split usually is — say so plainly rather than half-doing it.
