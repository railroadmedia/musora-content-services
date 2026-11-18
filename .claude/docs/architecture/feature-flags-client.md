# Plan: feature flags for the frontend and mobile app (mcs)

Status: implemented.
Scope: new `src/services/feature-flags/`, plus `src/services/config.js`,
`src/services/state.ts`, `jsdoc.json`, and the generated `src/index.js` / `src/index.d.ts`.
Depends on: railroadmedia/musora-platform-backend#1617, which adds `GET /api/feature/v1/flags`.
Related: `src/services/permissions/` — the closest existing module in shape, and the
pattern this borrows for caching.

## Context

musora-platform-backend has a feature-flag and experiment engine: flags with
variants, targeting rules, percentage rollouts, per-user overrides, schedules and
an admin UI. Server code reads it through `Feature::accessible($key)` and
`Experiment::variant($key)`.

**No client can read any of it.** `grep -rn feature_flags` across
musora-platform-frontend, MusoraApp and this package returns nothing. The backend
builds a full flag payload on every `/me` and every login response
(`UserResource.php:89`), and all three throw it away.

So three unrelated systems are in use today, none of them the engine:

- **musora-platform-frontend** — a hardcoded registry keyed on Vite env vars
  (`src/infrastructure/config/feature-flags.config.ts`), a `useFeatureFlag`
  composable, route gating via `meta.featureFlag`, and a per-browser
  `localStorage` override that wins in production. Three flags live. It cannot
  target a user, ramp a rollout, or record that anyone saw anything.
- **MusoraApp** — Firebase Remote Config (`v2_hide_discussions`,
  `v2_onboarding_flow_type`), with "experiments" that allowlist tester emails by
  regex.
- **this package** — nothing. The one flag-shaped thing,
  `multi_user_account_feature_flag` (`src/services/user/memberships.ts:11`), is a
  boolean the *caller* passes in, having evaluated it somewhere else.

Goal: this package becomes the client half of the real engine, so both apps read
one source, and so an experiment can record who actually saw it.

Not a goal: replacing either existing system. Both keep working untouched.

## Settled up front

| | |
|---|---|
| Ingest | mcs fetches; the apps call nothing |
| Source | New `GET /api/feature/v1/flags` |
| Reads | Synchronous, from an in-memory snapshot |
| Freshness | TTL checked on read, refreshed in the background (60s) |
| Exposures | An explicit call, batched POST, fire-and-forget |
| Surface | A namespace object, `featureFlags.*` |
| Anonymous users | Not supported; logged-out reads return defaults |
| Local per-browser override | Not carried over |
| `feature_flags` in `/me` | Kept |
| MusoraApp's mcs version bump | Out of scope |

Two of these were arrived at by discarding an earlier draft, and the reasoning
matters more than the conclusion.

### Brand needs no machinery

`feature_flags` has a `brand` column, so an early draft keyed the client cache by
brand and invalidated it whenever the user switched.

That was wrong. `scopeForBrand` is `WHERE brand = <brand> OR brand = 'musora'`
(`FeatureFlag.php:74-80`), and `musora` **is** the platform-wide scope — the
migration says so where the column is declared. A flag created through the admin
UI is `musora`, so flags are global by default; a brand-specific flag is an
opt-in *shadow* that wins for that one brand.

Invalidating on brand switch would therefore drop *every* flag — overwhelmingly
global, entirely unaffected by brand — to fix staleness in the rare scoped case.
It converts a rare wrong answer into a frequent one. Dropped entirely: no keying,
no invalidation hook, no discipline required of either app. A brand-scoped flag
may be stale until the next refresh, which is a limitation of brand-scoping
rather than something to engineer around.

### Priming is unnecessary

The other draft had each app hand this package the payload from the user object
it already holds — zero extra requests, one line per app.

Fetching wins on a capability priming cannot offer: **a rollout ramp reaches a
live session.** Primed flags only change when the app refetches its user, which
in a long session may be never; product moving a rollout from 10% to 50% would
reach nobody already running. A TTL refresh reaches them within a minute.

It also removes the failure mode where an app forgets to prime and every flag
silently reads as its default.

## Backend

One route, beside `POST /exposures` in
`app/Modules/Feature/routes/authenticated.php`:

```php
Route::get('/flags', FlagsController::class)->name('flags.index');
```

Under `api_authenticated`, not that file's `api_public` group: there is no
anonymous evaluation path, because `UserFlagPayload::for()` requires a `User`.

The controller is thin — `UserFlagPayload::for(user())` already builds the map and
already records nothing, which its own test asserts
(`UserFlagPayloadTest::handing_a_client_its_flags_records_nothing`).

The response is that map:

```json
{
  "new-checkout": { "variant": "on", "value": true, "version": 2, "reason": "rollout" }
}
```

`variant` is the variant key, `value` its value, `version` the flag definition's
version, `reason` one of `override|rule|rollout|holdout|default|disabled`. Draft
flags are excluded. An unknown flag is simply absent.

`UserFlagPayload`'s docblock currently argues *against* this endpoint — "Clients
already fetch the user at login and refresh, so flags travel with it rather than
needing a separate call." That assumed clients would use the `/me` payload; none
do. Amend it rather than leave the code contradicting its own comment.

`feature_flags` stays in `/me`. Nothing reads it, but it is the escape hatch for
the first-paint window described below, and both come from the same service so
they cannot disagree.

## Surface

New `src/services/feature-flags/` — `feature-flags.ts`, `types.ts`, `index.ts`,
`README.md`.

```ts
featureFlags.accessible(flagKey)                 // boolean
featureFlags.variant(flagKey, fallback = '')     // string
featureFlags.value(flagKey, fallback = null)     // unknown
featureFlags.recordExposure(flagKey)             // void
featureFlags.isReady()                           // boolean
featureFlags.reset()                             // void
```

`accessible` and `variant` mirror the server's `Evaluation::bool()` and
`::string()` exactly, including their strictness — `value === true`, and
`typeof value === 'string' ? value : fallback`. No coercion: `1` and `"true"` are
not accessible. An unknown flag reads `false` / `''`, matching
`Feature::accessible('typo')` and `Experiment::variant('typo')`.

`value` has no server counterpart, and exists because of a real gap. The admin API
accepts the full `FlagType` enum — `boolean`, `string`, `number`, `json`
(`StoreFlagRequest.php:24`) — while the facades expose only bool and string. A
`number` or `json` flag therefore reads as `false` / `''` server-side with no
indication anything is wrong. `value` closes that on the client and gives the
JSON-blob cases a migration path off Remote Config. **It does not fix the server
side**, which should be raised separately.

### Why a namespace object

`export const featureFlags` is invisible to the index generator, whose variable
regex hardcodes a single name:

```js
const exportVariableRegex = /\nexport\s+(let|const|var)\s+(globalConfig)\s+/g
```

Its re-export regex on the next line does pick it up, so an `index.ts` containing
`export { featureFlags } from './feature-flags'` reaches the barrel with no change
to the generator — the same shape `src/services/permissions/index.ts` already
uses. Accepted cost: no per-method tree-shaking.

## Behaviour

**The fetch is kicked off from `initializeService`**, exactly as award definitions
are (`src/services/config.js:101-104` — dynamic import, background, errors
caught). Both apps already call `initializeService` wherever the session changes,
so neither needs a new call.

**Reads are synchronous.** This is the decision the mobile ergonomics turn on: an
async read forces `useState` + `useEffect` + a loading branch into every consumer,
where `src_v2/hooks/useAccessLevel.ts` shows the idiom is a `useMemo` over
context. The cost is honest and worth stating: a read before the first fetch
resolves returns the default, so a flag can flicker on first paint. `isReady()`
makes that detectable, and priming from the `/me` payload is the fix if it ever
matters — which is why that payload stays.

**Freshness** follows `src/services/permissions/permissions.ts`, adapted to sync
reads: a read answers immediately from memory, and if the snapshot is older than
the TTL it kicks off a background refresh for next time, using
`wasLastUpdateOlderThanXSeconds` / `setLastUpdatedTime` from
`src/lib/lastUpdated.js`. No timer — which matters in React Native — and no
fetches while nobody is reading. 60s, rather than `permissions.ts`'s 10s.

**Exposures are explicit.** Reading a flag records nothing. This is the load-
bearing decision: a flag read in a layout that never renders the variant would
otherwise count a subject who saw nothing, and an analysis denominator inflated
that way is exactly how the production `homepage-v2` experiment produced no valid
conclusion. `recordExposure` is called at the point the user actually sees the
thing.

It looks up `variant`, `version` and `reason` from the cached snapshot — the
client echoes the version it evaluated under and never computes one, which is what
keeps an exposure true to the definition in force at the time. Reports queue,
debounce, and flush in batches up to the server's limit of 50.

Failures are dropped silently, with no retry and no persistence. That is safe
because the server's unique index on `(user_id, flag_key, brand, flag_version)`
makes re-reporting a genuine no-op: a lost exposure heals the next session the
flag is read, and `first_seen_at` still reflects the true first sighting.
Non-recordable reasons (`default`, `disabled`, `not_found`) are dropped
client-side rather than posted for the server to discard.

Keeping `recordExposure` as the only public surface means the delivery mechanism
can later be swapped for the WatermelonDB sync layer — which is bidirectional and
present in both apps — without touching a call site. That was considered and set
aside: everything it syncs is mutable, user-owned state the client reads back,
whereas an exposure is an append-only fact with no reader, so a store would need a
pull endpoint and a conflict comparator that exist only to satisfy the framework,
and adding a table bumps `X-Sync-Schema-Version` for every synced client.

**Also**: `clearState()` in `src/services/state.ts` calls `featureFlags.reset()`
— note `clearState` is `void`, so reset must be synchronous, unlike
`permissions.reset()`. Add the new directory to `jsdoc.json`'s `source.include`
or it will not appear in the published docs. Run `npm run build-index` and commit
the regenerated barrel.

## Tests

`test/unit/feature-flags.test.ts`, following
`test/unit/public-announcements.test.ts` — `initializeTestService()` in
`beforeEach`, `global.fetch` stubbed and restored in `afterEach`.

- `accessible` is true only for `value === true`, not `1` and not `"true"`
- `variant` returns the fallback for a non-string value
- an unknown flag reads `false` / `''` and records nothing
- **reading a flag records no exposure**
- `recordExposure` posts the snapshot's `version`, and drops
  `default`/`disabled`/`not_found` without issuing a request
- more than 50 exposures split across requests
- a stale read answers immediately and triggers exactly one background refresh
- `reset()` returns reads to defaults and `isReady()` to false

Backend: a feature test for the endpoint — payload shape, that it records nothing
(mirroring `UserFlagPayloadTest`), and 401 when logged out.

## Verification

1. Create and activate a flag with a rollout in the admin UI at
   `/admin/features/flags`.
2. `curl` `/api/feature/v1/flags` as a logged-in user; confirm the key, `version`
   and `reason`.
3. Link this package into musora-platform-frontend and, from the console:
   `featureFlags.isReady()`, then `featureFlags.accessible('…')`.
4. `featureFlags.recordExposure('…')`, then check
   `SELECT * FROM feature_flag_exposures WHERE flag_key = '…'` — one row. Call it
   four more times: still one row.
5. Confirm the flag's admin detail page shows the exposure.
6. Ramp the rollout in the admin UI, wait past the TTL, and read again **in the
   same session** — the new value should arrive without a reload. This is the
   capability that justified this package owning the fetch, so it is the step
   worth not skipping.

## Known gaps

- **MusoraApp is pinned to musora-content-services 2.149.0**; the frontend is on
  2.177. The app cannot consume any of this until that bump, which spans 29
  releases of unrelated change.
- **`number` and `json` flags are unreadable server-side.** The admin API accepts
  them; the facades have no `int()`/`array()`. The client gets `value`; the server
  does not.
- **Anonymous users get defaults.** No endpoint evaluates flags for a guest.
  Guests can only report exposures, via a client-generated `X-Anonymous-Id`.
- **First paint can flicker** until the first fetch resolves — see `isReady()`.
- **Brand-scoped flags can be stale** until the next refresh.
- **The frontend will need a composable** to make these reactive; this package
  holds a plain object Vue cannot track, so the wrapper should take the user ref
  as its reactive dependency, as `useFeatureFlag.ts` already does. Consumer work,
  not part of this change.
- **Two flag systems on the web** until the env-var flags migrate. Worth a written
  rule for which to reach for, or people will guess.
