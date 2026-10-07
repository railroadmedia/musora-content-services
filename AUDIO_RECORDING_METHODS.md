# Audio Recording — MCS Methods Reference

All methods below are exported from the top-level `musora-content-services` package
(`import { ... } from 'musora-content-services'`). Source: `src/services/audioRecording/`
and `src/services/audioRecording/waveformPeaks.js`.

## Recording session flow

### `startSession(userId, contentId, videoTimeMs, extras?)`
Starts a new recording session. Returns `{ folder, chunk_seconds }`.
- `userId`: the recording user's id
- `contentId`: lesson id (nullable)
- `videoTimeMs`: video position when recording starts
- `extras` (optional): `{ startedAt, timing: { playToGumMs, gumToRecorderStartMs }, capture: { userAgent, sampleRate, channelCount, echoCancellation, noiseSuppression, autoGainControl }, date }`
  — sync anchors for the ML side, written into the session's `metadata.json`. `date`
  defaults to the device's own local calendar day (`toLocaleDateString('sv-SE')`) if
  omitted — don't compute it yourself unless you need to override it.

### `createAudioChunkUploader(folder, extension)`
Create **once per session**. Returns `{ upload, finish }`.
- `upload(index, chunk, videoTimeMs, peaks?, timing?)` — call for every chunk produced.
  `chunk` is a base64 string (native — no Blob support) or a Blob (web). `peaks` is
  optional client-computed waveform data for that chunk (array of floats) — see note in
  Waveform section below on whether this is currently required.
- `finish()` — call once at session end. On web with WebM, this rewrites chunk 1's
  header in place with real Duration + Cues for native player seekability; a no-op for
  every other format/platform.
- Wraps the raw upload call — never call the chunk-upload endpoint directly.

### `stopSession(userId, folder, durationMs, chunkCount, format, reason?, videoTimeMs?)`
Called twice per session:
- **Pause checkpoint**: `reason: null` — keeps duration/chunk_count/format current
  without closing the session (a paused-but-not-finished recording is already
  visible/playable).
- **Real finish**: `reason` set to `'manual'` / `'timeout'` / `'max_duration'` / `'navigated_away'` — closes
  the session and triggers missing-chunk detection.
- `videoTimeMs` is the video position at that moment — the 'end' event uses it.

### `stopSessionOnPageExit(folder, durationMs, chunkCount, format, videoTimeMs?)`
**Web only** — not applicable to native. Called from a `pagehide` handler (tab closed,
reload, navigation away). Uses `fetch` with `keepalive` instead of the normal HTTP
client, since ordinary in-flight fetches get cancelled on unload. Same payload shape as
`stopSession()`, with `reason: 'page_exit'`.

### `logSeekEvent(folder, fromVideoTimeMs, toVideoTimeMs, elapsedMs?)`
Call when the user seeks the video while recording is active. Also closes the current
chunk at that moment so chunk anchors stay exact across the jump.

### `trackAudioRecordingSession(folder, options?)`
Manages the pause/resume/timeout/max-duration state machine for an already-started session (the
caller drives the actual recorder; this stays in sync with it). Returns
`{ pause, resume, finish, activeElapsedMs, isPaused, elapsedMs }`.
- `options.graceMs` (default `180000`): how long an unattended pause is tolerated before
  auto-timing-out.
- `options.onTimeout`: callback fired when the grace period elapses. **Does not close
  the session itself** — the caller must call `stopSession(..., reason: 'timeout')` from
  inside this callback, or the session just sits open indefinitely.
- `options.maxActiveMs` (default `900000`, 15 minutes): the most recorded time one
  session may hold. Paused time doesn't count toward it.
- `options.onMaxDuration`: callback fired when `maxActiveMs` of recorded time is reached.
  Like `onTimeout`, it **does not close the session itself** — the caller must stop the
  recorder and call `stopSession(..., reason: 'max_duration')` from inside it.
- `finish()` returns the stop reason to send: `'timeout'` or `'max_duration'` when the
  tracker ended the session, otherwise `'manual'`.
- `options.getVideoTimeMs`: function returning the current video position. Without it,
  pause/resume events fall back to elapsed recording time instead of the real video
  position — always pass it if you can.
- Calls `logEvent` internally for pause/resume — never call that directly.

## Library / playback

### `listRecordings(userId?, contentId?, date?)`
Raw session list for the current lesson/day — `{ recordings: [...] }`, each with
`folder`, `created_at`, `duration_ms`, `chunk_count`, `missing_chunks`, `format`,
`take_number`, `name`. Show a take as `name`, or `Take {take_number}` when `name` is null.
Take numbers belong to the lesson and are never renumbered when a take is deleted, so
don't derive them from the list position.

### `getMyRecordings(limit = 20)`
One row per lesson the user has recorded on, newest first, already decorated with
`content` (title/thumbnail from Sanity) — for a "My Recordings" library screen.

### `getRecordedContentIds(startDate?, endDate?)`
Lesson ids with at least one recording — for a practice-tracker "has recording"
indicator. Pass only `startDate` for a single day, both for an inclusive range (weekly),
neither for all-time. **Requires network** — recordings are server-only, never synced
locally.

### `getCombinedAudioUrl(folder)`
Returns a URL string (no request made) for streaming a session's combined audio.
Consumed directly by an `<audio src>` / native player, or via a manual `fetch` — not
through the internal HTTP client, since a native media element can't attach an
Authorization header.

### `shareRecording(folder)` / `unshareRecording(folder)`
Creates (idempotent — re-sharing returns the same token) / revokes a share link for a
recording. Owner only.

### `renameRecording(folder, name)`
Sets a take's custom name (max 255 characters). Owner only. `null` or `''` clears it.
Returns the updated recording in the same shape as `listRecordings` items.

### `deleteRecording(folder)` / `deleteLessonRecordings(contentId)`
Deletes one take, or every take the user has on a lesson. Owner only. The takes disappear
from all recordings lists right away; the audio is removed for good after a 10-minute undo
window. `deleteLessonRecordings` resolves to `{ folders }` for undoing it. Take numbers of the
remaining takes don't change.

### `restoreRecordings(folders)`
Undo for the two delete methods, within the undo window — e.g. from an "Undo" toast. Rejects
with a 404 when nothing could be restored.

### `getSharedCombinedAudioUrl(token)`
Playback URL for a shared recording via its token — works for any signed-in user
holding the token, not just the owner.

## Waveform

### `getWaveformPeaks(folder)`
Fetches stored peaks for a recording, or `null` if none exist.
⚠️ Status pending: the server-side peak-generation job was removed — if this feature
stays in scope, peaks need to be computed client-side and passed via `upload()`'s
`peaks` param above. Confirm with product before building on this.

### `downsamplePeaks(peaks, targetCount)`
Pure helper — downsamples a peaks array to a target length (max-per-bucket) for
lower-resolution rendering.

## Lesson notes

Separate feature, but ships alongside audio recording (per-lesson notes attached to a
recording's context). Source: `src/services/userActivity.js` +
`src/services/sync/repositories/lesson-notes.ts`. Offline-first — backed by
WatermelonDB, unlike the audio recording methods above, which are server-only.

### `getLessonNotes(contentId, date?)`
Notes for a lesson, oldest first. Pass `date` (`YYYY-MM-DD`) to scope it to notes taken
on that specific day (e.g. one practice tracker item); omit it for the lesson's full
note history (e.g. the playback notes drawer). Purely a local read — works offline once
the table has been pulled at least once.

### `createLessonNote(contentId, notes, timestampMs?, date?)`
Creates a new note — a lesson can have any number of independent notes. `notes` is
sanitized HTML server-side (bold/italic/underline/links/lists only — no
images/iframes). `timestampMs` is the video position at save time; pass `null`/omit for
notes taken outside the playback experience (no position to capture) — **not currently
populated by any caller**, pending product confirmation on the auto-timestamp-on-save
behavior. `date` defaults to the device's local calendar day if omitted — don't compute
it yourself unless overriding. Works offline — the local write always succeeds
immediately regardless of connectivity; sync to the server retries automatically once
back online.

### `updateLessonNote(id, notes)`
Edits a note's text. `id` is the local record id returned by `getLessonNotes()`.
`timestamp_ms` cannot be changed here — it's immutable after creation, by design (an
edit must never move the timestamp the note was originally taken at). Works offline,
same as `createLessonNote`.

### `deleteLessonNote(id)`
Deletes a note (soft delete + sync). `id` is the local record id. Works offline.

### `getContentIdsWithLessonNotes()`
Lesson ids with at least one note that has visible text (notes left empty don't count) — for a practice-tracker "has notes" indicator,
mirroring `getRecordedContentIds()` above. Purely a local read, **no network call at
all** (unlike `getRecordedContentIds`, which always requires connectivity, since
recordings aren't synced locally).

⚠️ Offline caveat, applies to all lesson-notes reads above: if the local table has
**never** been pulled from the server before (a brand-new user, or local data that was
just purged), a read attempted while offline throws rather than returning empty — there
must be at least one successful online pull first. Writes are never affected by this;
they always succeed locally regardless.

## Settings

Saved on the user's profile, so a toggle changed on one device applies on every device.

### `fetchAudioSettings()`
Returns `{ recording_enabled, voice_commands_enabled, help_improve_coach,
help_improve_coach_updated_at, coach_feedback_enabled }`, or the defaults
(`recording_enabled: true`, everything else `false`) when the user has never saved any.
`recording_enabled` is the user's preference only: start recording only when it's on
**and** the device has mic permission. If permission is skipped or denied, keep the toggle
off on that device without updating the saved preference.

### `updateAudioSettings(changes)`
Pass only the toggles that changed, e.g. `updateAudioSettings({ recording_enabled: false })`;
the rest keep their values. Changing `help_improve_coach` (the Musora Coach consent)
updates `help_improve_coach_updated_at`. Resolves to the full settings after the update.

## Small utilities (platform-agnostic)

### `formatDurationMs(ms)`
Formats milliseconds as `M:SS` for display.

### `getExtensionForMimeType(mimeType)` / `getMimeTypeForExtension(extension)`
Map between a recording MIME type and its file extension and back.

## Web-only — not applicable on native

- `isFormatSupported(mimeType)` / `getSupportedFormats()` — use `MediaRecorder`, which
  doesn't exist in React Native.
- WebM seekability fixing (internal to `createAudioChunkUploader`) — native never
  produces WebM, so this path is always a no-op there.
