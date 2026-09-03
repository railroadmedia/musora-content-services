const LOCK_NAME = 'sync-introspection-dump-leader'

export async function runAsLeader<T>(task: () => Promise<T>): Promise<T | undefined> {
  if (typeof navigator === 'undefined' || !navigator.locks) {
    return task()
  }

  return navigator.locks.request(LOCK_NAME, { ifAvailable: true }, (lock) => {
    if (!lock) return undefined
    return task()
  })
}
