/**
 * Waveform Peaks
 * Client-side capture/generation/drawing of audio amplitude data, plus fetching
 * server-stored peaks. Kept separate from audioRecording.js while it's still
 * undecided whether peak generation stays client-side or moves fully server-side
 * (see WaveformPeaksGenerator/GenerateWaveformPeaksJob on the backend) — if it moves,
 * this whole file becomes optional/removable without touching session/recording logic.
 */

import { GET } from '../../infrastructure/http/HttpClient.ts'
import { globalConfig } from '../config.js'
import { BASE_PATH } from './audioRecording.js'

/**
 * Downsample peaks array to target count (uses max in each bucket)
 */
export function downsamplePeaks(peaks, targetCount) {
  if (peaks.length <= targetCount) return peaks

  const result = []
  const step = peaks.length / targetCount

  for (let i = 0; i < targetCount; i++) {
    const start = Math.floor(i * step)
    const end = Math.floor((i + 1) * step)
    let max = 0
    for (let j = start; j < end; j++) {
      max = Math.max(max, peaks[j] || 0)
    }
    result.push(Math.round(max * 1000) / 1000)
  }

  return result
}

/**
 * Fetch stored waveform peaks for a recording
 */
export async function getWaveformPeaks(folder) {
  try {
    const data = await GET(`${BASE_PATH}/waveform?folder=${encodeURIComponent(folder)}`)
    return data.peaks && data.peaks.length > 0 ? data.peaks : null
  } catch {
    return null
  }
}

/**
 * Fetch and decode audio for playback and waveform generation. Goes through the same
 * /combined route as getCombinedAudioUrl, but as a JS-mediated fetch it can (and does)
 * attach the auth token manually, since HttpClient itself only parses JSON/text bodies.
 */
export async function fetchAndDecodeAudio(url, audioContext) {
  const headers = { Accept: '*/*' }
  if (globalConfig.sessionConfig?.token) {
    headers['Authorization'] = `Bearer ${globalConfig.sessionConfig.token}`
  }

  const response = await fetch(url, { headers, credentials: 'include' })

  if (!response.ok) {
    throw new Error('Failed to fetch audio')
  }

  const arrayBuffer = await response.arrayBuffer()
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0))

  return {
    arrayBuffer,
    audioBuffer,
    duration: audioBuffer.duration,
    mimeType: response.headers.get('Content-Type') || 'audio/webm',
  }
}

/**
 * Generate waveform peaks from audio buffer
 */
export function generateWaveformPeaks(audioBuffer, samples = 1000) {
  const channelData = audioBuffer.getChannelData(0)
  const blockSize = Math.floor(channelData.length / samples)
  const peaks = []

  for (let i = 0; i < samples; i++) {
    const start = blockSize * i
    let max = 0
    for (let j = 0; j < blockSize; j++) {
      max = Math.max(max, Math.abs(channelData[start + j] || 0))
    }
    peaks.push(max)
  }

  return peaks
}

/**
 * Draw static waveform on canvas
 */
export function drawStaticWaveform(canvas, peaks, options = {}) {
  const ctx = canvas.getContext('2d')
  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()

  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  ctx.scale(dpr, dpr)

  const width = rect.width
  const height = rect.height
  const centerY = height / 2
  const barWidth = options.barWidth || 2
  const gap = options.gap || 1
  const barsCount = Math.floor(width / (barWidth + gap))
  const colorStart = options.colorStart || '#4ade80'
  const colorMid = options.colorMid || '#22c55e'
  const colorEnd = options.colorEnd || '#4ade80'
  const bgColor = options.bgColor || '#1d1d1d'

  // Use actual bar count based on available peaks
  const actualBarsCount = Math.min(barsCount, peaks.length)
  const step = peaks.length / actualBarsCount
  const normalizedPeaks = []

  for (let i = 0; i < actualBarsCount; i++) {
    const start = Math.floor(i * step)
    const end = Math.floor((i + 1) * step)
    let max = 0
    for (let j = start; j < end; j++) {
      if (j < peaks.length) {
        max = Math.max(max, Math.abs(peaks[j]))
      }
    }
    normalizedPeaks.push(max)
  }

  // Normalize to full height
  const peakMax = Math.max(...normalizedPeaks, 0.1)
  const scaledPeaks = normalizedPeaks.map((p) => p / peakMax)

  // Clear canvas
  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, width, height)

  // Calculate bar spacing to fill entire width
  const totalBarSpace = width / actualBarsCount
  const actualBarWidth = Math.max(1, totalBarSpace - gap)

  // Draw bars
  scaledPeaks.forEach((amp, i) => {
    const barHeight = Math.max(2, amp * height * 0.85)
    const x = i * totalBarSpace

    const gradient = ctx.createLinearGradient(
      0,
      centerY - barHeight / 2,
      0,
      centerY + barHeight / 2
    )
    gradient.addColorStop(0, colorStart)
    gradient.addColorStop(0.5, colorMid)
    gradient.addColorStop(1, colorEnd)

    ctx.fillStyle = gradient
    ctx.fillRect(x, centerY - barHeight / 2, actualBarWidth, barHeight)
  })

  return scaledPeaks
}

// RMS + peak blend for one analyser frame — shared by the data-only capture and the
// visual waveform, so both agree on what "amplitude" means.
function computeAmplitude(analyser) {
  const bufferLength = analyser.frequencyBinCount
  const dataArray = new Uint8Array(bufferLength)
  analyser.getByteTimeDomainData(dataArray)

  let sumSquares = 0
  let peak = 0
  for (let i = 0; i < bufferLength; i++) {
    const v = (dataArray[i] - 128) / 128
    sumSquares += v * v
    peak = Math.max(peak, Math.abs(v))
  }
  const rms = Math.sqrt(sumSquares / bufferLength)
  return Math.min(1, Math.max(0.02, rms * 2, peak * 0.7))
}

/**
 * Captures live microphone amplitude for chunk peaks, without rendering anything —
 * the data half of createLiveWaveform, for recorder UIs that don't show a waveform.
 */
export function createPeakCapture(mediaStream, options = {}) {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)()
  const analyser = audioContext.createAnalyser()
  analyser.fftSize = options.fftSize || 2048
  analyser.smoothingTimeConstant = 0.3

  const source = audioContext.createMediaStreamSource(mediaStream)
  source.connect(analyser)

  let animationId = null
  let chunkPeaks = []
  let paused = false

  function sample() {
    if (!paused) {
      chunkPeaks.push(computeAmplitude(analyser))
    }
    animationId = requestAnimationFrame(sample)
  }

  sample()

  return {
    analyser,
    stop() {
      if (animationId) {
        cancelAnimationFrame(animationId)
        animationId = null
      }
      audioContext.close()
    },
    flushChunkPeaks() {
      const peaks = [...chunkPeaks]
      chunkPeaks = []
      return peaks
    },
    pause() {
      paused = true
    },
    resume() {
      paused = false
    },
  }
}

/**
 * Create live waveform visualizer with peak capture for storage. Thin rendering
 * layer over createPeakCapture — use that directly if you don't need the canvas.
 */
export function createLiveWaveform(canvas, mediaStream, options = {}) {
  const capture = createPeakCapture(mediaStream, options)
  const ctx = canvas.getContext('2d')

  let animationId = null
  let history = []
  let paused = false

  const barWidth = options.barWidth || 2
  const gap = options.gap || 1
  const colorStart = options.colorStart || '#4ade80'
  const colorMid = options.colorMid || '#22c55e'
  const colorEnd = options.colorEnd || '#4ade80'
  const bgColor = options.bgColor || '#1d1d1d'

  function initCanvas() {
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, rect.width, rect.height)
  }

  function draw() {
    // Frozen on the last drawn frame while paused — the mic stream itself keeps
    // running, so without this the waveform would keep reacting to sound the
    // recorder isn't actually capturing.
    if (paused) {
      animationId = requestAnimationFrame(draw)
      return
    }

    const rect = canvas.getBoundingClientRect()
    const width = rect.width
    const height = rect.height
    const amplitude = computeAmplitude(capture.analyser)

    history.push(amplitude)
    const maxBars = Math.floor(width / (barWidth + gap))
    if (history.length > maxBars) {
      history.shift()
    }

    // Clear and draw
    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, width, height)

    const centerY = height / 2
    history.forEach((amp, i) => {
      const barHeight = Math.max(2, amp * height * 0.9)
      const x = i * (barWidth + gap)

      const gradient = ctx.createLinearGradient(
        0,
        centerY - barHeight / 2,
        0,
        centerY + barHeight / 2
      )
      gradient.addColorStop(0, colorStart)
      gradient.addColorStop(0.5, colorMid)
      gradient.addColorStop(1, colorEnd)

      ctx.fillStyle = gradient
      ctx.fillRect(x, centerY - barHeight / 2, barWidth, barHeight)
    })

    animationId = requestAnimationFrame(draw)
  }

  initCanvas()
  draw()

  return {
    stop() {
      if (animationId) {
        cancelAnimationFrame(animationId)
        animationId = null
      }
      capture.stop()
    },
    resize: initCanvas,
    flushChunkPeaks: capture.flushChunkPeaks,
    pause() {
      paused = true
      capture.pause()
    },
    resume() {
      paused = false
      capture.resume()
    },
  }
}

export default {
  downsamplePeaks,
  getWaveformPeaks,
  fetchAndDecodeAudio,
  generateWaveformPeaks,
  drawStaticWaveform,
  createPeakCapture,
  createLiveWaveform,
}
