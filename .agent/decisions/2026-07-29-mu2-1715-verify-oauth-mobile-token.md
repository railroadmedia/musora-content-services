---
date: 2026-07-29
branch: chore/MU2-1715-verify-oauth-mobile-token
pr: https://github.com/railroadmedia/musora-content-services/pull/1019
status: open
tags: [[feature]]
---

# Add verifyOAuthToken service for mobile OAuth login

## Context
MusoraApp needs to exchange a mobile OAuth `id_token` (Google/Apple sign-in) for a platform auth session by calling the backend's user-management-system OAuth verify endpoint. No existing MCS service wrapped this call.

## Decision
Added `verifyOAuthToken(provider, params)` in `src/services/user/session.ts`. It POSTs to `/api/user-management-system/v1/oauth/{provider}/verify` via `HttpClient`, accepting `id_token`, optional `access_token`, `device_name`, optional `device_token`, `platform` (`ios`/`android`), and optional `user`. `OAuthProvider` is typed as `'google' | 'apple'`. Exported through the generated index so MusoraApp can import it directly from the package root.

## Alternatives Considered
No alternatives considered.

## Consequences
New public API surface: `verifyOAuthToken` and `OAuthProvider`/`VerifyOAuthTokenParams` types available from `musora-content-services`. MusoraApp can call this instead of hand-rolling the fetch for mobile OAuth verification.
