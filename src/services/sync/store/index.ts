import { Database, Q, type Collection, type Model, type RecordId } from '@nozbe/watermelondb'
import SyncSerializer from '../serializers'
import {
  SyncToken,
  SyncEntry,
  SyncStorePullSingleDTO,
  SyncStorePullMultiDTO,
  SyncStorePushDTO,
  SyncStorePushResponseAcknowledged,
  SyncStorePushResponseUnreachable,
} from '..'
import { SyncPullResponse, SyncPushResponse, PushPayload } from '../fetch'
import { BaseResolver, LastWriteConflictResolver } from '../resolvers'

export default class SyncStore<
  TModel extends Model = Model,
  TSerializer extends SyncSerializer = SyncSerializer,
> {
  readonly db: Database
  readonly model: TModel
  readonly collection: Collection<TModel>
  readonly serializer: TSerializer | SyncSerializer
  readonly Resolver: BaseResolver

  lastFetchTokenKey: string
  currentSync: Promise<SyncPullResponse> | null = null

  readonly pull: (
    previousFetchToken: SyncToken | null,
    signal?: AbortSignal
  ) => Promise<SyncPullResponse>
  readonly push: (payload: PushPayload, signal?: AbortSignal) => Promise<SyncPushResponse>

  fetchedOnceSuccessfully: boolean = false

  constructor({
    model,
    db,
    pull,
    push,
    serializer,
    Resolver,
  }: {
    model: TModel
    db: Database
    pull: (previousFetchToken: SyncToken | null, signal?: AbortSignal) => Promise<SyncPullResponse>
    push: (payload: PushPayload, signal?: AbortSignal) => Promise<SyncPushResponse>
    serializer?: TSerializer
    Resolver?: typeof BaseResolver
  }) {
    this.db = db
    this.model = model
    this.collection = db.collections.get(model.table)
    this.serializer = serializer ?? new SyncSerializer()
    this.Resolver = Resolver ?? LastWriteConflictResolver

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

  async pushOneImmediate(record: TModel) {
    const pushed = await this.internalPush([record])

    if (pushed.acknowledged) {
      const result = pushed.results[0]
      if (result.type === 'success') {
        await this.writeLocal([result.entry])
        const data = await this.readLocalOne(result.entry.record.id)

        const ret: SyncStorePushDTO = {
          data,
          state: 'synced',
        }
        return ret
      } else {
        throw new Error('SyncStore.pushOneImmediate: failed to push record') // todo - proper error
      }
    } else {
      throw new Error('SyncStore.pushOneImmediate: failed to push record') // todo - proper error
    }
  }

  async readOne(id: string) {
    const [data, fetchToken] = await Promise.all([this.readLocalOne(id), this.getLastFetchToken()])

    const result: SyncStorePullSingleDTO = {
      success: true,
      data,
      status: 'possiblyStale',
      previousFetchToken: fetchToken,
      fetchToken: null,
    }
    return result
  }

  async readAll() {
    const [data, fetchToken] = await Promise.all([this.readLocalAll(), this.getLastFetchToken()])

    const result: SyncStorePullMultiDTO = {
      success: true,
      data,
      status: 'possiblyStale',
      previousFetchToken: fetchToken,
      fetchToken: null,
    }
    return result
  }

  // swr pattern
  async readButFetchOne(id: string) {
    const [data, fetchToken] = await Promise.all([this.readLocalOne(id), this.getLastFetchToken()])
    this.syncInternal()

    const result = {
      success: true,
      data,
      status: 'possiblyStale',
      previousFetchToken: fetchToken,
      fetchToken: null,
    }
    return result
  }

  // swr pattern
  async readButFetchAll() {
    const [data, fetchToken] = await Promise.all([this.readLocalAll(), this.getLastFetchToken()])
    this.syncInternal()

    const result = {
      success: true,
      data,
      status: 'possiblyStale',
      previousFetchToken: fetchToken,
      fetchToken: null,
    }
    return result
  }

  async fetchAll() {
    const response = await this.syncInternal()
    const data = await this.readLocalAll()

    if (!response.success) {
      // todo - error response
      throw new Error('SyncStore.fetchAll: failed to fetch')
    }

    const result: SyncStorePullMultiDTO = {
      success: true,
      data,
      status: 'fresh',
      previousFetchToken: response.previousToken,
      fetchToken: response.token,
    }
    return result
  }

  async fetchOne(id: string) {
    const response = await this.syncInternal()
    const data = await this.readLocalOne(id)

    if (!response.success) {
      // todo - error response
      throw new Error('SyncStore.fetchOne: failed to fetch')
    }

    const result: SyncStorePullSingleDTO = {
      success: true,
      data,
      status: 'fresh',
      previousFetchToken: response.previousToken,
      fetchToken: response.token,
    }
    return result
  }

  // ideal for initial load - ensures user reloading page would get fresh data
  async fetchAllOnce() {
    if (!this.fetchedOnceSuccessfully) {
      return this.fetchAll()
    }
    return this.readAll()
  }

  // ideal for initial load - ensures user reloading page would get fresh data
  async fetchOneOnce(id: string) {
    if (!this.fetchedOnceSuccessfully) {
      return this.fetchOne(id)
    }
    return this.readOne(id)
  }

  private async pushUnsynced(signal: AbortSignal) {
    const results = await this.collection.query().fetch()
    const pushable = results.filter((rec) => rec._raw._status !== 'synced')

    if (pushable.length === 0) return
    await this.internalPush(pushable, signal)
  }

  private async internalPush(pushable: TModel[], signal?: AbortSignal) {
    const entries = pushable.map((rec) => {
      const record = this.serializer.toPlainObject(rec)
      const meta = {
        deleted: rec._raw._status === 'deleted',
      }

      return {
        record,
        meta,
      }
    })
    const payload = {
      entries,
    }

    let pushed: SyncPushResponse
    try {
      pushed = await this.push(payload, signal)
    } catch (error) {
      const response: SyncStorePushResponseUnreachable = {
        acknowledged: false,
        status: 'unreachable',
        originalError: error,
      }

      return response
    }

    // todo - if pushedresponse.ok - could be 400, etc.

    const response: SyncStorePushResponseAcknowledged = {
      acknowledged: true,
      results: pushed.results,
    }

    const successfulResults = response.results.filter(result => result.type === 'success')
    const successfulEntries = successfulResults.map(result => result.entry)
    await this.writeLocal(successfulEntries)

    return response
  }

  private async syncInternal(signal?: AbortSignal) {
    if (this.currentSync) return this.currentSync

    this.currentSync = (async () => {
      const response = await this.fetch(signal)

      if (response.success) {
        await this.writeLocal(response.entries, !response.previousToken)
        await this.setLastFetchToken(response.token)

        this.fetchedOnceSuccessfully = true
      }

      return response
    })()

    try {
      return await this.currentSync
    } finally {
      this.currentSync = null
    }
  }

  private async fetch(signal?: AbortSignal) {
    const lastFetchToken = await this.getLastFetchToken()
    return await this.pull(lastFetchToken, signal)
  }

  private async readLocalAll() {
    const records = await this.collection.query().fetch()
    return records.map((record) => this.serializer.toPlainObject(record))
  }

  private async readLocalOne(id: string) {
    return this.collection
      .query(Q.where('id', id))
      .fetch()
      .then((records) => this.serializer.toPlainObject(records[0]))
  }

  private async writeLocal(entries: SyncEntry[], freshSync: boolean = false) {
    await this.withWriteLock(async () => {
      const builds = await this.buildSyncedRecordsFromEntries(entries, freshSync)
      if (builds.length === 0) return

      await this.db.write(async (writer) => {
        await writer.batch(...builds)
      })
    })
  }

  private async withWriteLock(write: () => Promise<void>) {
    return navigator.locks.request(`sync:write:${this.db.adapter.dbName}`, write)
  }

  private async buildSyncedRecordsFromEntries(entries: SyncEntry[], freshSync: boolean = false) {
    const existingRecordsMap = new Map<RecordId, TModel>()
    const existingRecords = await this.collection
      .query(Q.where('id', Q.oneOf(entries.map((e) => e.record.id.toString()))))
      .fetch()
    for (const record of existingRecords) {
      existingRecordsMap.set(record.id, record)
    }

    // if this is a fresh sync and there are no existing records, we can skip more sophisticated conflict resolution
    const [entriesToCreate, tuplesToUpdate, recordsToDelete] =
      freshSync && existingRecordsMap.size === 0
        ? [entries.filter((e) => !e.meta.lifecycle.deleted_at), [], []]
        : entries.reduce<[SyncEntry[], [TModel, SyncEntry][], TModel[]]>(
            (acc, entry) => {
              const resolver = new this.Resolver({
                createRecord: (entry) => acc[0].push(entry),
                updateRecord: (existing, entry) => acc[1].push([existing, entry]),
                deleteRecord: (existing) => acc[2].push(existing),
              })
              const existing = existingRecordsMap.get(entry.meta.ids.id.toString())
              if (existing) {
                switch (existing._raw._status) {
                  case 'disposable':
                    // TODO - invariant violation
                    break

                  case 'deleted':
                    resolver.againstDeleted(existing, entry)
                    break

                  case 'updated':
                    resolver.againstDirty(existing, entry)
                    break

                  case 'created': // shouldn't really happen?
                  case 'synced':
                  default:
                    resolver.againstClean(existing, entry)
                }
              } else {
                resolver.againstNone(entry)
              }
              return acc
            },
            [[], [], []]
          )

    const createdBuilds = entriesToCreate.map((entry) => {
      return this.collection.prepareCreate((r) => {
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
      return record.prepareUpdate((r) => {
        Object.entries(entry.record).forEach(([key, value]) => {
          if (key !== 'id') r[key] = value
        })
        r._raw['created_at'] = entry.meta.lifecycle.created_at
        r._raw['updated_at'] = entry.meta.lifecycle.updated_at

        r._raw._status = 'synced'
        r._raw._changed = ''
      })
    })
    const deletedBuilds = recordsToDelete.map((record) => {
      return record.prepareDestroyPermanently()
    })

    return [...createdBuilds, ...updatedBuilds, ...deletedBuilds]
  }
}
