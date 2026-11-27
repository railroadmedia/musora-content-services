import SyncContext from '../context'
import type SyncStore from '../store'
import { postDiagnostics } from './diagnostics-fetch'

const CURSOR_REPORT_DEBOUNCE_MS = 5000

export function reportCursors(context: SyncContext, storesRegistry: Record<string, SyncStore<any>>) {
  const lastPulledAt = new Map<string, number>()
  let timer: ReturnType<typeof setTimeout> | null = null

  async function report() {
    timer = null
    if (!context.connectivity.getValue()) return

    const cursors = await Promise.all(
      Object.entries(storesRegistry).map(async ([tableName, store]) => ({
        model_name: tableName,
        last_fetch_token: await store.getLastFetchToken(),
        last_pulled_at: lastPulledAt.get(tableName) ?? null,
      }))
    )

    await postDiagnostics('/cursors', {
      client_id: context.session.getClientId(),
      client_session_id: context.session.getSessionId() ?? '',
      client_created_at: Date.now(),
      cursors,
    })
  }

  function scheduleReport() {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => report().catch(() => {}), CURSOR_REPORT_DEBOUNCE_MS)
  }

  const unsubscribePulls = Object.entries(storesRegistry).map(([tableName, store]) =>
    store.on('pullCompleted', () => {
      lastPulledAt.set(tableName, Date.now())
      scheduleReport()
    })
  )

  scheduleReport()

  return () => {
    if (timer) clearTimeout(timer)
    unsubscribePulls.forEach((unsubscribe) => unsubscribe())
  }
}
