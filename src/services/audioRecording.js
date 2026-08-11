/**
 * Audio Recording Service
 * Shared methods for audio recording functionality across FE and MA
 */

const MIME_TYPES = {
  'm4a': 'audio/mp4',
  'mp4': 'audio/mp4',
  'webm': 'audio/webm',
  'ogg': 'audio/ogg',
  'aac': 'audio/aac',
};

const EXTENSIONS = {
  'audio/mp4': 'm4a',
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/aac': 'aac',
};

const RECORDING_FORMATS = [
  'audio/mp4;codecs=mp4a.40.2',
  'audio/mp4',
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/aac',
];

/**
 * Check if a MIME type is supported by MediaRecorder
 */
export function isFormatSupported(mimeType) {
  return typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mimeType);
}

/**
 * Get list of supported recording formats
 */
export function getSupportedFormats() {
  return RECORDING_FORMATS.filter(isFormatSupported);
}

/**
 * Get file extension for a MIME type
 */
export function getExtensionForMimeType(mimeType) {
  const base = mimeType.split(';')[0].trim();
  return EXTENSIONS[base] || 'bin';
}

/**
 * Get MIME type for a file extension
 */
export function getMimeTypeForExtension(extension) {
  return MIME_TYPES[extension] || 'application/octet-stream';
}

/**
 * Format duration in milliseconds to MM:SS
 */
export function formatDuration(ms) {
  const secs = Math.floor(ms / 1000);
  const mins = Math.floor(secs / 60);
  const s = secs % 60;
  return `${mins}:${s.toString().padStart(2, '0')}`;
}

/**
 * Format time in seconds to MM:SS
 */
export function formatTime(seconds) {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Downsample peaks array to target count (uses max in each bucket)
 */
export function downsamplePeaks(peaks, targetCount) {
  if (peaks.length <= targetCount) return peaks;

  const result = [];
  const step = peaks.length / targetCount;

  for (let i = 0; i < targetCount; i++) {
    const start = Math.floor(i * step);
    const end = Math.floor((i + 1) * step);
    let max = 0;
    for (let j = start; j < end; j++) {
      max = Math.max(max, peaks[j] || 0);
    }
    result.push(Math.round(max * 1000) / 1000);
  }

  return result;
}

/**
 * Start a recording session
 */
export async function startSession(apiBase, userId, contentId = null, videoTimeMs = null) {
  const response = await fetch(`${apiBase}/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ user_id: userId, content_id: contentId, video_time_ms: videoTimeMs }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.message || err.error || 'Failed to start session');
  }

  return response.json();
}

/**
 * Upload a chunk to the server
 */
export async function uploadChunk(apiBase, folder, index, extension, blob, videoTimeMs = 0, peaks = null) {
  const body = new FormData();
  body.append('folder', folder);
  body.append('index', index);
  body.append('extension', extension);
  body.append('video_time_ms', videoTimeMs);
  body.append('recorded_at', Date.now());
  body.append('chunk', blob, `${String(index).padStart(4, '0')}.${extension}`);
  if (peaks && peaks.length > 0) {
    body.append('peaks', JSON.stringify(peaks));
  }

  const response = await fetch(`${apiBase}/chunk`, {
    method: 'POST',
    headers: { 'Accept': 'application/json' },
    body,
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || payload.message || 'Failed to upload chunk');
  }

  return payload;
}

/**
 * Stop a recording session and save metadata
 */
export async function stopSession(apiBase, userId, folder, durationMs, chunkCount, format) {
  const response = await fetch(`${apiBase}/stop`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      user_id: userId,
      folder,
      duration_ms: durationMs,
      chunk_count: chunkCount,
      format,
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.message || err.error || 'Failed to stop session');
  }

  return response.json();
}

/**
 * List recordings for a user
 */
export async function listRecordings(apiBase, userId, contentId = null, date = null) {
  let url = `${apiBase}/list?user_id=${userId}`;
  if (contentId) url += `&content_id=${encodeURIComponent(contentId)}`;
  if (date) url += `&date=${encodeURIComponent(date)}`;

  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' },
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.message || err.error || 'Failed to load recordings');
  }

  return response.json();
}

/**
 * Get combined audio URL for a recording
 */
export function getCombinedAudioUrl(apiBase, folder) {
  return `${apiBase}/combined?folder=${encodeURIComponent(folder)}`;
}

/**
 * Fetch stored waveform peaks for a recording
 */
export async function getWaveformPeaks(apiBase, folder) {
  const response = await fetch(`${apiBase}/waveform?folder=${encodeURIComponent(folder)}`, {
    headers: { 'Accept': 'application/json' },
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return data.peaks && data.peaks.length > 0 ? data.peaks : null;
}

/**
 * Fetch and decode audio for playback and waveform generation
 */
export async function fetchAndDecodeAudio(url, audioContext) {
  const response = await fetch(url, {
    headers: { 'Accept': '*/*' },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch audio');
  }

  const arrayBuffer = await response.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));

  return {
    arrayBuffer,
    audioBuffer,
    duration: audioBuffer.duration,
    mimeType: response.headers.get('Content-Type') || 'audio/webm',
  };
}

/**
 * Generate waveform peaks from audio buffer
 */
export function generateWaveformPeaks(audioBuffer, samples = 1000) {
  const channelData = audioBuffer.getChannelData(0);
  const blockSize = Math.floor(channelData.length / samples);
  const peaks = [];

  for (let i = 0; i < samples; i++) {
    const start = blockSize * i;
    let max = 0;
    for (let j = 0; j < blockSize; j++) {
      max = Math.max(max, Math.abs(channelData[start + j] || 0));
    }
    peaks.push(max);
  }

  return peaks;
}

/**
 * Draw static waveform on canvas
 */
export function drawStaticWaveform(canvas, peaks, options = {}) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const width = rect.width;
  const height = rect.height;
  const centerY = height / 2;
  const barWidth = options.barWidth || 2;
  const gap = options.gap || 1;
  const barsCount = Math.floor(width / (barWidth + gap));
  const colorStart = options.colorStart || '#4ade80';
  const colorMid = options.colorMid || '#22c55e';
  const colorEnd = options.colorEnd || '#4ade80';
  const bgColor = options.bgColor || '#1d1d1d';

  // Use actual bar count based on available peaks
  const actualBarsCount = Math.min(barsCount, peaks.length);
  const step = peaks.length / actualBarsCount;
  const normalizedPeaks = [];

  for (let i = 0; i < actualBarsCount; i++) {
    const start = Math.floor(i * step);
    const end = Math.floor((i + 1) * step);
    let max = 0;
    for (let j = start; j < end; j++) {
      if (j < peaks.length) {
        max = Math.max(max, Math.abs(peaks[j]));
      }
    }
    normalizedPeaks.push(max);
  }

  // Normalize to full height
  const peakMax = Math.max(...normalizedPeaks, 0.1);
  const scaledPeaks = normalizedPeaks.map(p => p / peakMax);

  // Clear canvas
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);

  // Calculate bar spacing to fill entire width
  const totalBarSpace = width / actualBarsCount;
  const actualBarWidth = Math.max(1, totalBarSpace - gap);

  // Draw bars
  scaledPeaks.forEach((amp, i) => {
    const barHeight = Math.max(2, amp * height * 0.85);
    const x = i * totalBarSpace;

    const gradient = ctx.createLinearGradient(0, centerY - barHeight / 2, 0, centerY + barHeight / 2);
    gradient.addColorStop(0, colorStart);
    gradient.addColorStop(0.5, colorMid);
    gradient.addColorStop(1, colorEnd);

    ctx.fillStyle = gradient;
    ctx.fillRect(x, centerY - barHeight / 2, actualBarWidth, barHeight);
  });

  return scaledPeaks;
}

/**
 * Create live waveform visualizer with peak capture for storage
 */
export function createLiveWaveform(canvas, mediaStream, options = {}) {
  const ctx = canvas.getContext('2d');
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = options.fftSize || 2048;
  analyser.smoothingTimeConstant = 0.3;

  const source = audioContext.createMediaStreamSource(mediaStream);
  source.connect(analyser);

  let animationId = null;
  let history = [];
  let chunkPeaks = [];

  const barWidth = options.barWidth || 2;
  const gap = options.gap || 1;
  const colorStart = options.colorStart || '#4ade80';
  const colorMid = options.colorMid || '#22c55e';
  const colorEnd = options.colorEnd || '#4ade80';
  const bgColor = options.bgColor || '#1d1d1d';

  function initCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, rect.width, rect.height);
  }

  function draw() {
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteTimeDomainData(dataArray);

    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Calculate RMS and peak for better accuracy
    let sumSquares = 0;
    let peak = 0;
    for (let i = 0; i < bufferLength; i++) {
      const v = (dataArray[i] - 128) / 128;
      sumSquares += v * v;
      peak = Math.max(peak, Math.abs(v));
    }
    const rms = Math.sqrt(sumSquares / bufferLength);
    const amplitude = Math.min(1, Math.max(0.02, rms * 2, peak * 0.7));

    // Record for chunk storage
    chunkPeaks.push(amplitude);

    history.push(amplitude);
    const maxBars = Math.floor(width / (barWidth + gap));
    if (history.length > maxBars) {
      history.shift();
    }

    // Clear and draw
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    const centerY = height / 2;
    history.forEach((amp, i) => {
      const barHeight = Math.max(2, amp * height * 0.9);
      const x = i * (barWidth + gap);

      const gradient = ctx.createLinearGradient(0, centerY - barHeight / 2, 0, centerY + barHeight / 2);
      gradient.addColorStop(0, colorStart);
      gradient.addColorStop(0.5, colorMid);
      gradient.addColorStop(1, colorEnd);

      ctx.fillStyle = gradient;
      ctx.fillRect(x, centerY - barHeight / 2, barWidth, barHeight);
    });

    animationId = requestAnimationFrame(draw);
  }

  initCanvas();
  draw();

  return {
    stop() {
      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
      audioContext.close();
    },
    resize: initCanvas,
    flushChunkPeaks() {
      const peaks = [...chunkPeaks];
      chunkPeaks = [];
      return peaks;
    },
  };
}

export default {
  MIME_TYPES,
  EXTENSIONS,
  RECORDING_FORMATS,
  isFormatSupported,
  getSupportedFormats,
  getExtensionForMimeType,
  getMimeTypeForExtension,
  formatDuration,
  formatTime,
  downsamplePeaks,
  startSession,
  uploadChunk,
  stopSession,
  listRecordings,
  getCombinedAudioUrl,
  getWaveformPeaks,
  fetchAndDecodeAudio,
  generateWaveformPeaks,
  drawStaticWaveform,
  createLiveWaveform,
};
