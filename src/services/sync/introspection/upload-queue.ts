import SyncContext from '../context'
import { diagnosticsFetch } from './diagnostics-fetch'

class DiagnosticUploadError extends Error {
  constructor(public path: string, public status: number) {
    super(`Diagnostic upload to ${path} failed with status ${status}`)
  }
}

function isPermanentlyRejected(error: unknown): boolean {
  return error instanceof DiagnosticUploadError && error.status >= 400 && error.status < 500
}

export function createUploadQueue<TEntry>(path: string, maxPending = Infinity) {
  const pending: TEntry[] = []
  let isDraining = false
  let generation = 0

  async function upload(entry: TEntry): Promise<void> {
    const response = await diagnosticsFetch(path, {
      method: 'POST',
      body: JSON.stringify(entry),
    })

    if (!response.ok) throw new DiagnosticUploadError(path, response.status)
  }

  async function drain(context: SyncContext): Promise<void> {
    if (isDraining) return
    isDraining = true
    const drainGeneration = generation

    try {
      while (pending.length && context.connectivity.getValue()) {
        try {
          await upload(pending[0])
        } catch (error) {
          if (!isPermanentlyRejected(error)) break
        }
        if (generation !== drainGeneration) break
        pending.shift()
      }
    } finally {
      isDraining = false
    }

    if (generation !== drainGeneration && pending.length) drain(context)
  }

  function clear() {
    pending.length = 0
    generation++
  }

  function enqueue(entry: TEntry, context: SyncContext) {
    pending.push(entry)
    if (pending.length > maxPending) pending.splice(0, pending.length - maxPending)
    drain(context)
  }

  return { enqueue, drain, clear }
}
