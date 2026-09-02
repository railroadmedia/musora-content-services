/**
 * WebM Seekability Fixer
 * Web-only (relies on `ts-ebml` + `Blob`) and irrelevant on MA, which never produces
 * WebM in the first place — kept isolated so it's obviously skippable/removable per
 * platform without touching session/recording logic in audioRecording.js.
 */

import { uploadChunk } from './audioRecording.js'

/**
 * Exported functions that are excluded from index generation.
 *
 * @type {string[]}
 */
const excludeFromGeneratedIndex = ['createWebmSeekabilityFixer']

/**
 * Incrementally decodes WebM chunks as they're recorded, then at record-stop rewrites
 * chunk 1's header in place with real Duration + Cues, so native players can show
 * duration and seek. Only relevant for WebM (Firefox); MP4/M4A already have both.
 *
 * `ebml` is the ts-ebml module/namespace ({ Decoder, Reader, tools }). Pass it explicitly
 * (e.g. a CDN-loaded global) where no bundler is available; omit it to dynamically
 * import the real 'ts-ebml' package where one is (this only executes the import when
 * no `ebml` is given, so environments that always pass one never need to resolve it).
 */
export async function createWebmSeekabilityFixer(ebml) {
  const lib = ebml ?? (await import('ts-ebml'))
  const decoder = new lib.Decoder()
  const reader = new lib.Reader()

  let queue = Promise.resolve()
  let firstChunkBuffer = null

  function feedChunk(chunkIndex, blob) {
    queue = queue
      .then(() => blob.arrayBuffer())
      .then((buffer) => {
        if (chunkIndex === 1) {
          firstChunkBuffer = buffer
        }
        decoder.decode(buffer).forEach((elm) => reader.read(elm))
      })
  }

  async function finish(folder, extension) {
    if (!firstChunkBuffer) return

    await queue
    reader.stop()

    if (reader.metadataSize > firstChunkBuffer.byteLength) {
      console.warn(
        `WebM header (${reader.metadataSize}B) spans past chunk 1 (${firstChunkBuffer.byteLength}B) — skipping seekability fix.`
      )
      return
    }

    const refined = lib.tools.makeMetadataSeekable(reader.metadatas, reader.duration, reader.cues)
    const tail = firstChunkBuffer.slice(reader.metadataSize)
    const fixedFirstChunk = new Blob([refined, tail], { type: 'audio/webm' })

    await uploadChunk(folder, 1, extension, fixedFirstChunk)
  }

  return { feedChunk, finish }
}

/**
 * Wraps uploadChunk with the WebM seekability fix, so callers never need to know
 * whether the recording format needs it — pass whatever extension getExtensionForMimeType
 * returned and this decides on its own.
 */
export async function createAudioChunkUploader(folder, extension) {
  const fixer = extension === 'webm' ? await createWebmSeekabilityFixer() : null

  function upload(index, chunk, videoTimeMs, peaks, timing = null) {
    fixer?.feedChunk(index, chunk)
    return uploadChunk(folder, index, extension, chunk, videoTimeMs, peaks, timing)
  }

  function finish() {
    return fixer ? fixer.finish(folder, extension) : Promise.resolve()
  }

  return { upload, finish }
}

export default {
  createWebmSeekabilityFixer,
  createAudioChunkUploader,
}
