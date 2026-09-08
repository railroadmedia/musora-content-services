---
date: 2026-08-17
branch: fix/password-reset-mobile-token
pr: https://github.com/railroadmedia/musora-content-services/pull/1031
status: open
tags: [bug-fix]
---

# Password reset mobile token and sessionConfig access

## Context
Mobile app needed `resetPassword` to return an authenticated session directly (avoiding a separate login step after reset), and two OAuth session functions were reading `userId` from a stale top-level `globalConfig.userId` field instead of the current `globalConfig.sessionConfig.userId` shape.

## Decision
- `resetPassword` (`src/services/user/account.ts`) now accepts optional `deviceName`, `deviceToken`, `platform` on `PasswordResetProps` and returns `Promise<AuthResponse | null>` instead of `Promise<void>`, so mobile can pass device info and receive a session back from the reset call.
- `listOAuthProviders` and `unlinkOAuthProvider` (`src/services/user/session.ts`) now read `userId` from `globalConfig.sessionConfig.userId`.

## Alternatives Considered
No alternatives considered.

## Process Notes
Initial implementation had a bug: the request body sent `token: props.password` instead of `token: props.token`, which would have sent the user's new password as the reset token. Caught and fixed before opening the PR.

## Consequences
- `resetPassword` callers must handle the new return type (`AuthResponse | null`) instead of `void`.
- Mobile clients can now log in immediately after a password reset without a separate auth call.
- OAuth provider list/unlink calls no longer resolve `userId` as `undefined`.
