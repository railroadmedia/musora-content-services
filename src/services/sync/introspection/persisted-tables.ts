import _IncrementalIndexedDBAdapter from 'lokijs/src/incremental-indexeddb-adapter'

const IncrementalIndexedDBAdapter = (_IncrementalIndexedDBAdapter as any).default ?? _IncrementalIndexedDBAdapter

function stripLokiFields(doc: Record<string, unknown>): Record<string, unknown> {
  const { $loki, meta, ...raw } = doc
  return raw
}

async function loadPersistedLoki(dbName: string): Promise<any | null> {
  const adapter = new IncrementalIndexedDBAdapter()

  try {
    return await new Promise((resolve, reject) => {
      adapter.loadDatabase(dbName, (result: unknown) => {
        result instanceof Error ? reject(result) : resolve(result)
      })
    })
  } finally {
    adapter.idb?.close()
  }
}

export async function readPersistedTables(dbName: string, tableNames: string[]): Promise<Record<string, unknown[]>> {
  const loki = await loadPersistedLoki(dbName)
  if (!loki) return Object.fromEntries(tableNames.map((tableName) => [tableName, []]))

  return Object.fromEntries(
    tableNames.map((tableName) => {
      const collection = loki.collections.find((c: any) => c.name === tableName)
      return [tableName, collection ? collection.getData().map(stripLokiFields) : []]
    })
  )
}
