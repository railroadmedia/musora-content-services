import { globalConfig } from '../../config.js'
import SyncContext from '../context'

export type DiagnosticEvent = {
  model_name: string
  record_id: string
  op: 'upserted' | 'deleted' | 'restored'
  changed_fields: Record<string, [unknown, unknown]>
  timestamp: number
}

const EVENT_DEBOUNCE_MS = 2000

async function uploadEvents(events: DiagnosticEvent[], context: SyncContext): Promise<void> {
  if (!events.length) return

  await fetch(`${globalConfig.baseUrl}/api/sync/v1/diagnostics/events`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(globalConfig.sessionConfig?.token ? { Authorization: `Bearer ${globalConfig.sessionConfig.token}` } : {}),
    },
    body: JSON.stringify({
      client_id: context.session.getClientId(),
      client_session_id: context.session.getSessionId() ?? '',
      events,
    }),
  })
}

export function createEventBatcher(context: SyncContext, delayMs = EVENT_DEBOUNCE_MS) {
  let buffer: DiagnosticEvent[] = []
  let timer: ReturnType<typeof setTimeout> | null = null

  function flush() {
    if (timer) clearTimeout(timer)
    timer = null
    if (!buffer.length) return

    const events = buffer
    buffer = []
    uploadEvents(events, context)
  }

  function queue(events: DiagnosticEvent[]) {
    buffer.push(...events)
    if (timer) clearTimeout(timer)
    timer = setTimeout(flush, delayMs)
  }

  return { queue, flush }
}
