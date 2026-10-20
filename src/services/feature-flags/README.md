# Feature flags

Reads the backend's feature-flag and experiment engine — the same one the admin
UI at `/admin/features` writes to, and the same one server-side PHP reads through
`Feature::accessible()` and `Experiment::variant()`.

## Using it

```js
import { featureFlags } from 'musora-content-services'

if (featureFlags.accessible('new-checkout', brand)) {
  // ...
}

const copy = featureFlags.variant('checkout-copy', brand, 'control')
```

Nothing needs initialising. The first read of a brand fetches that brand, and
reads answer synchronously from what has been fetched.

| | |
|---|---|
| `accessible(flagKey, brand)` | `true` only when the flag's value is exactly `true` |
| `variant(flagKey, brand, fallback = '')` | the value when it is a string, otherwise the fallback |
| `value(flagKey, brand, fallback = null)` | the raw value, for `number` and `json` flags |
| `recordExposure(flagKey, brand)` | reports that this subject saw the flag |
| `isReady(brand)` | whether that brand has been fetched yet |
| `refresh(brand)` | forces a fetch; you should not normally need this |
| `reset()` | drops every brand; called on logout |

## Brand is not optional

Brand is a targeting attribute, so one key can resolve differently per brand.
Flags are held per brand and the brand you pass is the one you get an answer
for -- passing the wrong one gives you a real answer to the wrong question,
which is why there is no default. Exposures are filed under the same brand you
read with.

An unknown flag reads `false` / `''`, matching what the server answers for a key
it does not have.

## Read a flag with the accessor its type expects

Each flag declares a type (`boolean`, `string`, `number`, `json`) and the payload
carries it. Reading a string flag with `accessible()` answers `false` -- which is
exactly what a boolean flag that is off answers, so the mistake looks like a
working flag rather than a bug. The module warns once per flag when the accessor
and the type disagree:

```
featureFlags.accessible('checkout-copy') reads a boolean flag, but
'checkout-copy' is typed string. Use variant() instead.
```

A warning, not a throw: the read still answers, and a type changed in the admin
UI must not take a page down. Nothing is said for a flag with no entry yet --
during the window before the first fetch there is no type to check against.

## Reading is free; being seen is not

`accessible()` and `variant()` record nothing. Call `recordExposure()` at the
point the user actually sees the thing:

```js
const variant = featureFlags.variant('checkout-copy', brand, 'control')

onMounted(() => featureFlags.recordExposure('checkout-copy'))
```

This is deliberate, and it is the whole reason exposure is a separate call. A
flag read in a layout that never renders the variant would otherwise count a
subject who saw nothing, and an experiment whose denominator includes people who
were never shown anything cannot measure a difference. That is not hypothetical
— it is why the production `homepage-v2` experiment, with 201k users bucketed,
produced no usable conclusion.

Reporting is cheap and safe to repeat: the server keys a record on
`(subject, flag, version)` and ignores duplicates. A report that fails to send
is let go of rather than held as sent, so the next read of that flag sends it
again — there is no retry queue, but a failure is not permanent either.

Reports batch on a short timer so a page checking several flags costs one
request. On the web, anything still queued is sent when the page is hidden —
otherwise navigating away would take the reports with it, and the exposure most
likely to be lost is the one for whatever the subject just clicked through. That
send uses `fetch(keepalive)` rather than `sendBeacon`, because a beacon cannot
carry the `Authorization` header and would arrive unattributed.

## Reads are synchronous, so they can be early

A read before that brand's first fetch resolves returns the fallback, which is
what the fallback is for -- not "the flag said no", which the server answers with
the flag's own default. Use `isReady(brand)` where the difference matters:

```js
if (featureFlags.isReady(brand) && featureFlags.accessible('new-checkout', brand)) {
```

Synchronous is the deliberate trade: an async read would put `useState` +
`useEffect` + a loading branch into every consumer in the mobile app, for a
window that is normally a few hundred milliseconds after sign-in.

## Freshness

Each brand's snapshot refreshes at most once a minute, and only when something
reads a flag on that brand — so a session that never touches a flag never
fetches, and no timer is left running.

A failed fetch is left alone for five seconds before a read may try again.
Nothing is held after a failure, so the staleness check stays true and reads
happen in render paths; without that floor a backend outage becomes one request
per read per component. `refresh(brand)` ignores the floor, for when you know
the backend is back. A rollout ramped in the admin UI therefore reaches a session that is
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
