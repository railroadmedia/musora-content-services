import SyncContext from '../context'
import type SyncStore from '../store'
import { diagnosticsFetch, isPermanentRejectionStatus } from './diagnostics-fetch'

const CURSOR_REPORT_DEBOUNCE_MS = 5000

type DiagnosticCursor = {
  model_name: string
  last_fetch_token: number | null
  last_pulled_at: number | null
}

async function uploadCursors(cursors: DiagnosticCursor[], context: SyncContext): Promise<boolean> {
  try {
    const response = await diagnosticsFetch('/cursors', {
      method: 'POST',
      body: JSON.stringify({
        client_id: context.session.getClientId(),
        client_session_id: context.session.getSessionId() ?? '',
        client_created_at: Date.now(),
        cursors,
      }),
    })
    return response.ok || isPermanentRejectionStatus(response.status)
  } catch {
    return false
  }
}

export function reportCursors(context: SyncContext, storesRegistry: Record<string, SyncStore<any>>) {
  const pendingTableNames = new Set(Object.keys(storesRegistry))
  const lastPulledAt = new Map<string, number>()
  let timer: ReturnType<typeof setTimeout> | null = null
  let isReporting = false

  async function report() {
    timer = null
    if (isReporting) return scheduleReport()
    if (!pendingTableNames.size || !context.connectivity.getValue()) return
    isReporting = true

    const tableNames = [...pendingTableNames]
    pendingTableNames.clear()

    try {
      const cursors = await Promise.all(
        tableNames.map(async (tableName) => ({
          model_name: tableName,
          last_fetch_token: await storesRegistry[tableName].getLastFetchToken(),
          last_pulled_at: lastPulledAt.get(tableName) ?? null,
        }))
      )

      const isSettled = await uploadCursors(cursors, context)
      if (!isSettled) tableNames.forEach((tableName) => pendingTableNames.add(tableName))
    } catch {
      tableNames.forEach((tableName) => pendingTableNames.add(tableName))
    } finally {
      isReporting = false
    }
  }

  function scheduleReport() {
    if (timer) clearTimeout(timer)
    timer = setTimeout(report, CURSOR_REPORT_DEBOUNCE_MS)
  }

  const unsubscribePulls = Object.entries(storesRegistry).map(([tableName, store]) =>
    store.on('pullCompleted', () => {
      lastPulledAt.set(tableName, Date.now())
      pendingTableNames.add(tableName)
      scheduleReport()
    })
  )

  const unsubscribeConnectivity = context.connectivity.subscribe((isOnline) => {
    if (isOnline) scheduleReport()
  })

  scheduleReport()

  return () => {
    if (timer) clearTimeout(timer)
    unsubscribePulls.forEach((unsubscribe) => unsubscribe())
    unsubscribeConnectivity()
  }
}
