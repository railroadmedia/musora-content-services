import { Database, Q, type Collection, type Model, type RecordId } from '@nozbe/watermelondb'
import SyncSerializer, { type SyncSerialized } from '../serializers'
import { ServerPullResponse } from '../fetch'
import { SyncToken, SyncEntry } from '..'

type SyncStoreResponseMeta = {
  status: 'fresh' | 'possiblyStale'
  previousFetchToken: SyncToken | null
  fetchToken: SyncToken
}

export type SyncStoreMultiResponse<T extends SyncSerializer> = SyncStoreResponseMeta & {
  data: SyncSerialized<T>[]
}

export type SyncStoreSingleResponse<T extends SyncSerializer> = SyncStoreResponseMeta & {
  data: SyncSerialized<T>
}

export default class SyncStore<
  TModel extends Model = Model,
  TSerializer extends SyncSerializer = SyncSerializer,
> {
  readonly db: Database
  readonly model: TModel
  readonly collection: Collection<TModel>
  readonly serializer: TSerializer | SyncSerializer

  lastFetchToken: SyncToken | null = null
  currentSync: Promise<ServerPullResponse> | null = null

  readonly pull: (previousFetchToken: SyncToken | null) => Promise<ServerPullResponse>
  readonly push: () => Promise<any>

  fetchedOnce: boolean = false

  constructor({ model, db, pull, push, serializer }: {
    model: TModel,
    db: Database,
    pull: (previousFetchToken: SyncToken | null) => Promise<ServerPullResponse>,
    push: () => Promise<any>,
    serializer?: TSerializer
  }) {
    this.db = db
    this.model = model
    this.collection = db.collections.get(model.table)
    this.serializer = serializer ?? new SyncSerializer()

    this.pull = pull
    this.push = push
    this.lastFetchToken = `last_fetch_token:${this.model.table}`
  }

  async getLastFetchToken() {
    return this.db.localStorage.get<SyncToken | null>(this.lastFetchToken) ?? null
  }

  async setLastFetchToken(token: SyncToken) {
    return this.db.localStorage.set(this.lastFetchToken, token)
  }

  async sync() {
    await this.syncInternal()
  }

  async readOne(id: string) {
    // TODO - verify possible race condition - implement lock?
    const [data, fetchToken] = await Promise.all([
      this.readLocalOne(id),
      this.getLastFetchToken()
    ])

    return {
      data,
      status: 'possiblyStale',
      previousFetchToken: fetchToken,
      fetchToken
    }
  }

  async readAll() {
    // TODO - verify possible race condition - implement lock?
    const [data, fetchToken] = await Promise.all([
      this.readLocalAll(),
      this.getLastFetchToken()
    ])

    return {
      data,
      status: 'possiblyStale',
      previousFetchToken: fetchToken,
      fetchToken
    }
  }

  async fetchAll() {
    const response = await this.syncInternal()
    const data = await this.readLocalAll()

    return {
      data,
      status: 'fresh',
      previousFetchToken: response.previousToken,
      fetchToken: response.token
    }
  }

  async fetchOne(id: string) {
    const response = await this.syncInternal()
    const data = await this.readLocalOne(id)

    return {
      data,
      status: 'fresh',
      previousFetchToken: response.previousToken,
      fetchToken: response.token
    }
  }

  async fetchAllOnce() {
    if (!this.fetchedOnce) {
      return this.fetchAll()
    }
    return this.readAll()
  }

  async fetchOneOnce(id: string) {
    if (!this.fetchedOnce) {
      return this.fetchOne(id)
    }
    return this.readOne(id)
  }

  private async syncInternal() {
    if (this.currentSync) return this.currentSync

    this.currentSync = (async () => {
      const response = await this.fetch()

      await this.writeLocal(response.data, !response.previousToken)
      await this.setLastFetchToken(response.token)

      this.fetchedOnce = true

      return response
    })()

    try {
      return await this.currentSync
    } finally {
      this.currentSync = null
    }
  }

  private async fetch() {
    const lastFetchToken = await this.getLastFetchToken()
    const response = await this.pull(lastFetchToken)
    return response
  }

  private async readLocalAll() {
    const records = await this.collection.query().fetch()
    return records.map(record => this.serializer.toPlainObject(record))
  }

  private async readLocalOne(id: string) {
    return this.collection.query(Q.where('id', id)).fetch().then(records => this.serializer.toPlainObject(records[0]))
  }

  private async writeLocal(entries: SyncEntry[], freshSync: boolean = false) {
    return this.db.write(async writer => {
      const existingRecordsMap = new Map<RecordId, TModel>()
      if (!freshSync) {
        const existingRecords = await this.collection.query(Q.where('id', Q.oneOf(entries.map(e => e.record.id.toString())))).fetch()
        for (const record of existingRecords) {
          existingRecordsMap.set(record.id, record)
        }
      }

      const [entriesToCreate, tuplesToUpdate, recordsToDelete] = freshSync
        ? [entries.filter(entry => !entry.meta.deleted), [], []]
        : entries.reduce<[SyncEntry[], [TModel, SyncEntry][], TModel[]]>(
            (acc, entry) => {
              const existing = existingRecordsMap.get(entry.record.id.toString())
              if (existing) {
                if (entry.meta.deleted) {
                  acc[2].push(existing)
                } else {
                  acc[1].push([existing, entry])
                }
              } else {
                if (!entry.meta.deleted) {
                  acc[0].push(entry)
                }
              }
              return acc
            },
            [[], [], []]
          )

      const createdBuilds = entriesToCreate.map(entry => {
        return this.collection.prepareCreate(r => {
          Object.entries(entry.record).forEach(([key, value]) => {
            if (key === 'id') r._raw.id = value.toString()
            else r[key] = value
          })
        })
      })
      const updatedBuilds = tuplesToUpdate.map(([record, entry]) => {
        return record.prepareUpdate(r => {
          Object.entries(entry.record).forEach(([key, value]) => {
            if (key !== 'id') r[key] = value
          })
        })
      })
      const deletedBuilds = recordsToDelete.map(record => {
        return record.prepareDestroyPermanently()
      })

      const builds = [...createdBuilds, ...updatedBuilds, ...deletedBuilds]
      if (builds.length === 0) return

      await writer.batch(...builds)
    })
  }
}
