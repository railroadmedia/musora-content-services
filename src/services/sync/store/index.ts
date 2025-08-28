import { Database, Q, type Collection, type Model, type RecordId } from '@nozbe/watermelondb'
import SyncSerializer from '../serializers'
import { SyncToken, SyncEntry, SyncStorePullSingleDTO, SyncStorePullMultiDTO, SyncStorePushDTO, SyncStorePushResponseAcknowledged, SyncStorePushResponseUnreachable } from '..'
import { SyncPullResponse, SyncPushResponse, ClientPushPayload } from '../fetch'

export default class SyncStore<
  TModel extends Model = Model,
  TSerializer extends SyncSerializer = SyncSerializer,
> {
  readonly db: Database
  readonly model: TModel
  readonly collection: Collection<TModel>
  readonly serializer: TSerializer | SyncSerializer

  lastFetchTokenKey: string
  currentSync: Promise<SyncPullResponse> | null = null

  readonly pull: (previousFetchToken: SyncToken | null, signal: AbortSignal) => Promise<SyncPullResponse>
  readonly push: (payload: ClientPushPayload, signal: AbortSignal) => Promise<SyncPushResponse>

  fetchedOnce: boolean = false

  constructor({ model, db, pull, push, serializer }: {
    model: TModel,
    db: Database,
    pull: (previousFetchToken: SyncToken | null, signal: AbortSignal) => Promise<SyncPullResponse>,
    push: (payload: ClientPushPayload, signal: AbortSignal) => Promise<SyncPushResponse>,
    serializer?: TSerializer
  }) {
    this.db = db
    this.model = model
    this.collection = db.collections.get(model.table)
    this.serializer = serializer ?? new SyncSerializer()

    this.pull = pull
    this.push = push
    this.lastFetchTokenKey = `last_fetch_token:${this.model.table}`
  }

  async getLastFetchToken() {
    return (await this.db.localStorage.get<SyncToken | null>(this.lastFetchTokenKey)) ?? null
  }

  async setLastFetchToken(token: SyncToken | null) {
    if (token) {
      return this.db.localStorage.set(this.lastFetchTokenKey, token)
    } else {
      return this.db.localStorage.remove(this.lastFetchTokenKey)
    }
  }

  async sync(signal: AbortSignal) {
    await this.pushUnsynced(signal)

    // will return records that we just saw in push response, but we can't
    // be sure there were no other changes before the push
    await this.syncInternal(signal)
  }

  // TODO: should failure throw?
  async pushOneImmediate(record: TModel) {
    const pushed = await this.internalPush([record])

    if (pushed.acknowledged) {
      const result = pushed.results[0]
      if (result.success) {
        await this.writeLocal([result.entry], false)
        const data = await this.readLocalOne(result.entry.record.id)

        const ret: SyncStorePushDTO = {
          data,
          state: 'synced'
        }
        return ret
      } else {
        // todo
      }
    } else {
      // todo - throw?
    }
  }

  async readOne(id: string) {
    const [data, fetchToken] = await Promise.all([
      this.readLocalOne(id),
      this.getLastFetchToken()
    ])

    const result: SyncStorePullSingleDTO = {
      success: true,
      data,
      status: 'possiblyStale',
      previousFetchToken: fetchToken,
      fetchToken
    }
    return result
  }

  async readAll() {
    const [data, fetchToken] = await Promise.all([
      this.readLocalAll(),
      this.getLastFetchToken()
    ])

    const result: SyncStorePullMultiDTO = {
      success: true,
      data,
      status: 'possiblyStale',
      previousFetchToken: fetchToken,
      fetchToken
    }
    return result
  }

  async fetchAll() {
    const response = await this.syncInternal()
    const data = await this.readLocalAll()

    const result: SyncStorePullMultiDTO = {
      success: true,
      data,
      status: 'fresh',
      previousFetchToken: response.previousToken,
      fetchToken: response.token
    }
    return result
  }

  async fetchOne(id: string) {
    const response = await this.syncInternal()
    const data = await this.readLocalOne(id)

    const result: SyncStorePullSingleDTO = {
      success: true,
      data,
      status: 'fresh',
      previousFetchToken: response.previousToken,
      fetchToken: response.token
    }
    return result
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

  private async pushUnsynced(signal: AbortSignal) {
    const results = await this.collection.query().fetch()
    const pushable = results.filter(rec => rec._raw._status !== 'synced')

    if (pushable.length === 0) return
    await this.internalPush(pushable, signal)
  }

  private async internalPush(pushable: TModel[], signal?: AbortSignal) {
    const entries = pushable.map(rec => {
      const record = this.serializer.toPlainObject(rec)
      const meta = {
        deleted: rec._raw._status === 'deleted'
      }

      return {
        record,
        meta
      }
    })
    const payload = {
      entries
    }

    try {
      const pushed = await this.push(payload, signal)

      const response: SyncStorePushResponseAcknowledged = {
        acknowledged: true,
        results: pushed.results,
      }

      return response
    } catch (error) {
      const response: SyncStorePushResponseUnreachable = {
        acknowledged: false,
        status: 'unreachable',
        originalError: error
      }

      return response
    }
  }

  private async syncInternal(signal?: AbortSignal) {
    if (this.currentSync) return this.currentSync

    this.currentSync = (async () => {
      const response = await this.fetch(signal)

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

  private async fetch(signal: AbortSignal) {
    const lastFetchToken = await this.getLastFetchToken()
    const response = await this.pull(lastFetchToken, signal)
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
      // TODO - on freshSync - delete all records as defensive measure? what to do with potentially updated records?

      const existingRecordsMap = new Map<RecordId, TModel>()
      if (!freshSync) {
        const existingRecords = await this.collection.query(Q.where('id', Q.oneOf(entries.map(e => e.record.id.toString())))).fetch()
        for (const record of existingRecords) {
          existingRecordsMap.set(record.id, record)
        }
      }

      const [entriesToCreate, tuplesToUpdate, recordsToDelete] = freshSync
        ? [entries.filter(entry => !entry.meta.lifecycle.deleted_at), [], []]
        : entries.reduce<[SyncEntry[], [TModel, SyncEntry][], TModel[]]>(
            (acc, entry) => {
              const existing = existingRecordsMap.get(entry.meta.ids.id.toString())
              if (existing) {
                switch (existing._raw._status) {
                  case 'disposable':
                    // do what???
                    break;

                  case 'deleted':
                    if (entry.meta.lifecycle.deleted_at) {
                      acc[2].push(existing)
                    } else {
                      // do what???
                    }
                    break;

                  case 'updated':
                    if (entry.meta.lifecycle.deleted_at) {
                      // delete local even though user has newer changes
                      // otherwise would be some weird id changes/conflicts that I don't even want to think about right now
                      acc[2].push(existing)
                    // TODO - fix updated_at string vs int inconsistency
                    } else if (entry.meta.lifecycle.updated_at > existing._raw['updated_at']) {
                      acc[1].push([existing, entry])
                    } else {
                      // TODO - do we do this? or just ignore?
                      acc[1].push([existing, entry])
                    }
                    break;

                  case 'created': // shouldn't really happen
                  case 'synced':
                  default:
                    if (entry.meta.lifecycle.deleted_at) {
                      acc[2].push(existing)
                    } else {
                      acc[1].push([existing, entry])
                    }
                }
              } else {
                if (entry.meta.lifecycle.deleted_at) {
                  // ignore ???
                } else {
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
          r._raw['created_at'] = entry.meta.lifecycle.created_at
          r._raw['updated_at'] = entry.meta.lifecycle.updated_at

          r._raw._status = 'synced'
          r._raw._changed = ''
        })
      })
      const updatedBuilds = tuplesToUpdate.map(([record, entry]) => {
        return record.prepareUpdate(r => {
          Object.entries(entry.record).forEach(([key, value]) => {
            if (key !== 'id') r[key] = value
          })
          r._raw['created_at'] = entry.meta.lifecycle.created_at
          r._raw['updated_at'] = entry.meta.lifecycle.updated_at

          r._raw._status = 'synced'
          r._raw._changed = ''
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
