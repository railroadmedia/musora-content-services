# test/live

This directory is reserved for live tests that require real external services.

## Why is this empty?

Tests that previously lived here were written before the WatermelonDB sync rewrite.
Progress tracking now goes through the local sync store rather than calling Railcontent
directly — they were never updated, none were passing, and were removed rather than
left as misleading dead code.

## Where live verification actually belongs

**`mcs-cli`** is the right tool for manually verifying behaviour against real services.
Once the WatermelonDB ESM interop issues are resolved it can run commands like
`mcs progress reset`, `mcs progress get` against a local BE and staging Sanity
without needing a test framework.

**Postman collections** are better suited for verifying Railcontent API contracts —
checking that endpoint response shapes haven't changed in ways that would break MCS.

**Jest live tests** are a last resort — only for logic that genuinely cannot be
verified any other way. If added, they require:

- WatermelonDB test harness from TP-1192
- Dedicated test user account (not a real user)
- Valid `.env` credentials — see 1Password
- Manual trigger only: `npx jest --config=jest.live.config.js --no-coverage --forceExit`
- Must never run in CI
