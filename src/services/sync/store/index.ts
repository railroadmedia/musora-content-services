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
import type SyncRunScope from '../run-scope'

type ModelClass<T extends Model> = { new (...args: any[]): T; table: string };
type SyncPull = (previousFetchToken: SyncToken | null, signal: AbortSignal) => Promise<SyncPullResponse>
type SyncPush = (payload: PushPayload, signal: AbortSignal) => Promise<SyncPushResponse>

export type SyncStoreConfig<TModel extends Model = Model, TSerializer extends SyncSerializer = SyncSerializer> = {
  model: ModelClass<TModel>
  pull: SyncPull
  push: SyncPush
  serializer?: TSerializer
  Resolver?: typeof BaseResolver
}
export default class SyncStore<
  TModel extends Model = Model,
  TSerializer extends SyncSerializer = SyncSerializer,
> {
  static LOCK_NAMESPACE = 'sync:write'

  readonly runScope: SyncRunScope
  readonly db: Database
  readonly model: ModelClass<TModel>
  readonly collection: Collection<TModel>
  readonly serializer: TSerializer | SyncSerializer
  readonly Resolver: BaseResolver

  readonly puller: SyncPull
  readonly pusher: SyncPush

  lastFetchTokenKey: string
  currentPull: Promise<SyncPullResponse> | null = null

  fetchedOnceSuccessfully: boolean = false

  constructor({
    model,
    pull,
    push,
    serializer,
    Resolver,
  }: SyncStoreConfig<TModel, TSerializer>, db: Database, runScope: SyncRunScope) {
    this.runScope = runScope
    this.db = db
    this.model = model
    this.collection = db.collections.get(model.table)
    this.serializer = serializer ?? new SyncSerializer()
    this.Resolver = Resolver ?? LastWriteConflictResolver

    this.puller = pull
    this.pusher = push
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

  async sync() {
    await this.pushUnsynced()

    // will return records that we just saw in push response, but we can't
    // be sure there were no other changes before the push
    await this.pullRecords()
  }

  async pushOneImmediate(record: TModel) {
    const pushed = await this.pushRecords([record])

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
    this.pullRecords()

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
    this.pullRecords()

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
    const response = await this.pullRecords()
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
    const response = await this.pullRecords()
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

  private async pushUnsynced() {
    const results = await this.collection.query().fetch()
    const pushable = results.filter((rec) => rec._raw._status !== 'synced')

    if (pushable.length === 0) return
    await this.pushRecords(pushable)
  }

  private async pushRecords(pushable: TModel[]) {
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
      pushed = await this.pusher(payload, this.runScope.signal)
    } catch (error) {
      const response: SyncStorePushResponseUnreachable = {
        acknowledged: false,
        status: 'unreachable',
        originalError: error,
      }

      return response
    }

    const response: SyncStorePushResponseAcknowledged = {
      acknowledged: true,
      results: pushed.results,
    }

    const successfulResults = response.results.filter(result => result.type === 'success')
    const successfulEntries = successfulResults.map(result => result.entry)
    await this.writeLocal(successfulEntries)

    return response
  }

  private async pullRecords() {
    if (this.currentPull) return this.currentPull

    this.currentPull = (async () => {
      const lastFetchToken = await this.getLastFetchToken()
      const response = await this.puller(lastFetchToken, this.runScope.signal)

      if (response.success) {
        await this.writeLocal(response.entries, !response.previousToken)
        await this.setLastFetchToken(response.token)

        this.fetchedOnceSuccessfully = true
      }

      return response
    })()

    try {
      return await this.currentPull
    } finally {
      this.currentPull = null
    }
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
      await this.db.write(async (writer) => {
        const builds = await this.buildSyncedRecordsFromEntries(entries, freshSync)
        if (builds.length === 0) return

        await this.runScope.abortable(() => writer.batch(...builds))
      })
    })
  }

  private async withWriteLock(write: () => Promise<void>) {
    return navigator.locks.request(`${SyncStore.LOCK_NAMESPACE}:${this.db.adapter.dbName}`, write)
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
