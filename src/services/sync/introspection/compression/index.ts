import * as fflate from 'fflate'

export type CompressionWorkerConstructor = new () => Worker

function bytesToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000
  let binary = ''
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

export function compressPayload(payload: unknown): string {
  return bytesToBase64(fflate.gzipSync(fflate.strToU8(JSON.stringify(payload))))
}

export function compressInWorker(payload: unknown, CompressionWorker?: CompressionWorkerConstructor): Promise<string> {
  const worker = CompressionWorker ? new CompressionWorker() : undefined
  if (!worker) {
    return Promise.resolve(compressPayload(payload))
  }

  return new Promise((resolve, reject) => {
    worker.onmessage = (event: MessageEvent<string>) => {
      resolve(event.data)
      worker.terminate()
    }
    worker.onerror = (error) => {
      reject(error)
      worker.terminate()
    }
    worker.postMessage(payload)
  })
}
