import SyncContext from '../context'
import { createUploadQueue } from './upload-queue'

export type DiagnosticEvent = {
  model_name: string
  record_id: string
  op: 'upserted' | 'deleted' | 'restored'
  changed_fields: Record<string, [unknown, unknown]>
  client_created_at: number
}

type EventBatchEntry = {
  client_id: string
  client_session_id: string
  events: DiagnosticEvent[]
}

const EVENT_DEBOUNCE_MS = 2000
const EVENT_MAX_WAIT_MS = 10_000
const MAX_BUFFERED_EVENTS = 200
const MAX_PENDING_EVENT_BATCHES = 100

const eventQueue = createUploadQueue<EventBatchEntry>('/events', MAX_PENDING_EVENT_BATCHES)

export function drainEventQueue(context: SyncContext) {
  return eventQueue.drain(context)
}

export function clearEventQueue() {
  eventQueue.clear()
}

export function createEventBatcher(context: SyncContext, delayMs = EVENT_DEBOUNCE_MS, maxWaitMs = EVENT_MAX_WAIT_MS) {
  let buffer: DiagnosticEvent[] = []
  let timer: ReturnType<typeof setTimeout> | null = null
  let firstQueuedAt: number | null = null

  function flush() {
    if (timer) clearTimeout(timer)
    timer = null
    firstQueuedAt = null
    if (!buffer.length) return

    const events = buffer
    buffer = []
    eventQueue.enqueue(
      {
        client_id: context.session.getClientId(),
        client_session_id: context.session.getSessionId() ?? '',
        events,
      },
      context
    )
  }

  function queue(events: DiagnosticEvent[]) {
    buffer.push(...events)
    firstQueuedAt ??= Date.now()
    if (buffer.length >= MAX_BUFFERED_EVENTS) return flush()

    if (timer) clearTimeout(timer)
    const waitMs = Math.min(delayMs, firstQueuedAt + maxWaitMs - Date.now())
    timer = setTimeout(flush, Math.max(0, waitMs))
  }

  return { queue, flush }
}
