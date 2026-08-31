# Feature flags

Reads the backend's feature-flag and experiment engine — the same one the admin
UI at `/admin/features` writes to, and the same one server-side PHP reads through
`Feature::accessible()` and `Experiment::variant()`.

## Using it

```js
import { featureFlags } from 'musora-content-services'

if (featureFlags.accessible('new-checkout')) {
  // ...
}

const copy = featureFlags.variant('checkout-copy', 'control')
```

Nothing needs initialising. `initializeService` starts the fetch, and reads
answer synchronously from what has been fetched.

| | |
|---|---|
| `accessible(flagKey)` | `true` only when the flag's value is exactly `true` |
| `variant(flagKey, fallback = '')` | the value when it is a string, otherwise the fallback |
| `value(flagKey, fallback = null)` | the raw value, for `number` and `json` flags |
| `recordExposure(flagKey)` | reports that this subject saw the flag |
| `isReady()` | whether anything has been fetched yet |
| `refresh()` | forces a fetch; you should not normally need this |
| `reset()` | drops everything; called on logout |

An unknown flag reads `false` / `''`, matching what the server answers for a key
it does not have.

## Reading is free; being seen is not

`accessible()` and `variant()` record nothing. Call `recordExposure()` at the
point the user actually sees the thing:

```js
const variant = featureFlags.variant('checkout-copy', 'control')

onMounted(() => featureFlags.recordExposure('checkout-copy'))
```

This is deliberate, and it is the whole reason exposure is a separate call. A
flag read in a layout that never renders the variant would otherwise count a
subject who saw nothing, and an experiment whose denominator includes people who
were never shown anything cannot measure a difference. That is not hypothetical
— it is why the production `homepage-v2` experiment, with 201k users bucketed,
produced no usable conclusion.

Reporting is cheap and safe to repeat: the server keys a record on
`(user, flag, brand, version)` and ignores duplicates.

## Reads are synchronous, so they can be early

A read before the first fetch resolves returns the default. Use `isReady()` where
that matters:

```js
if (featureFlags.isReady() && featureFlags.accessible('new-checkout')) {
```

Synchronous is the deliberate trade: an async read would put `useState` +
`useEffect` + a loading branch into every consumer in the mobile app, for a
window that is normally a few hundred milliseconds after sign-in.

## Freshness

The snapshot refreshes at most once a minute, and only when something reads a
flag — so a session that never touches a flag never fetches, and no timer is left
running. A rollout ramped in the admin UI therefore reaches a session that is
already open, which it would not if flags were only read at sign-in.

## Reactivity

These are plain functions over a plain object, so nothing here is reactive. A Vue
caller that needs a flag to re-evaluate should wrap it in a computed that depends
on something Vue tracks — the user ref, typically, which is what
`useFeatureFlag.ts` in the frontend already does.

## What it does not do

- **Logged-out users.** Flags are evaluated for a user; a logged-out caller reads
  defaults. No request is made.
- **Local overrides.** The engine has per-user overrides that are auditable and
  visible in the admin UI. A client-side override would be invisible to anyone
  debugging and would quietly corrupt that person's experiment data.
