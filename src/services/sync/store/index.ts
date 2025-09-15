import { Database, Q, type Collection, type Model, type RecordId } from '@nozbe/watermelondb'
import { RawSerializer, ModelSerializer } from '../serializers'
import {
  SyncToken,
  SyncEntry,
  SyncStorePushResponseAcknowledged,
  SyncStorePushResponseUnreachable,
} from '..'
import { SyncPullResponse, SyncPushResponse, PushPayload } from '../fetch'
import { BaseResolver, LastWriteConflictResolver } from '../resolvers'
import type SyncRunScope from '../run-scope'
import { EventEmitter } from '../utils/event-emitter'
import BaseModel from '../models/Base'
import { EpochSeconds } from '../utils/epoch'
import { sanitizedRaw } from '@nozbe/watermelondb/RawRecord'

type ModelClass<T extends Model> = { new (...args: any[]): T; table: string };
type SyncPull = (previousFetchToken: SyncToken | null, signal: AbortSignal) => Promise<SyncPullResponse>
type SyncPush = (payload: PushPayload, signal: AbortSignal) => Promise<SyncPushResponse>

export type SyncStoreConfig<TModel extends BaseModel = BaseModel> = {
  model: ModelClass<TModel>
  pull: SyncPull
  push: SyncPush
}

export default class SyncStore<TModel extends BaseModel = BaseModel> {
  static LOCK_NAMESPACE = 'sync:write'

  readonly runScope: SyncRunScope
  readonly db: Database
  readonly model: ModelClass<TModel>
  readonly collection: Collection<TModel>
  readonly Resolver: typeof BaseResolver | LastWriteConflictResolver

  readonly rawSerializer: RawSerializer<TModel>
  readonly modelSerializer: ModelSerializer<TModel>

  readonly puller: SyncPull
  readonly pusher: SyncPush

  lastFetchTokenKey: string
  currentPull: Promise<SyncPullResponse> | null = null

  private emitter = new EventEmitter()

  constructor({
    model,
    pull,
    push,
  }: SyncStoreConfig<TModel>, db: Database, runScope: SyncRunScope) {
    this.runScope = runScope
    this.db = db
    this.model = model
    this.collection = db.collections.get(model.table)
    this.Resolver = LastWriteConflictResolver
    this.rawSerializer = new RawSerializer()
    this.modelSerializer = new ModelSerializer()

    this.puller = pull
    this.pusher = push
    this.lastFetchTokenKey = `last_fetch_token:${this.model.table}`

    window.Q = Q
    window.db = db
    window.collection = this.collection
    window.id = '402009'
    window.store = this
  }

  on = this.emitter.on.bind(this.emitter)
  off = this.emitter.off.bind(this.emitter)
  private emit = this.emitter.emit.bind(this.emitter)

  async sync() {
    await this.pushUnsynced()

    // will return records that we just saw in push response, but we can't
    // be sure there were no other changes before the push
    await this.pullRecords()
  }

  async getLastFetchToken() {
    return (await this.db.localStorage.get<SyncToken | null>(this.lastFetchTokenKey)) ?? null
  }

  private async setLastFetchToken(token: SyncToken | null) {
    if (token) {
      return this.db.localStorage.set(this.lastFetchTokenKey, token)
    } else {
      return this.db.localStorage.remove(this.lastFetchTokenKey)
    }
  }

  private async pushUnsynced() {
    const results = await this.collection.query().fetch()
    const records = results.filter((rec) => rec._raw._status !== 'synced')

    const deletedIds = await this.db.adapter.getDeletedRecords(this.collection.table)

    if (records.length || deletedIds.length) {
      await this.pushRecords(records, deletedIds)
    }
  }

  async pushId(id: RecordId) {
    // todo - reader block?
    const record = await this.queryRecord(id)

    if (record) {
      return this.pushRecords([record])
    } else {
      const payload = {
        entries: [{
          record: null,
          meta: {
            ids: { id },
            deleted: true as true,
          },
        }],
      }
      return this.makePush(payload)
    }
  }

  async pushRecords(pushable: TModel[], deletedIds: RecordId[] = []) {
    const entries = [...pushable.map(rec => {
      if (rec._raw._status === 'deleted') {
        return {
          record: null,
          meta: { ids: { id: rec._raw.id }, deleted: true as true },
        }
      } else {
        const record = this.rawSerializer.toPlainObject(rec)
        return {
          record,
          meta: { ids: { id: rec._raw.id }, deleted: false as false },
        }
      }
    }), ...deletedIds.map(id => {
      return {
        record: null,
        meta: { ids: { id }, deleted: true as true },
      }
    })]
    const payload = {
      entries,
    }

    return this.makePush(payload)
  }

  private async makePush(payload: PushPayload) {
    if (window.foo) { return }

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
    await this.write(successfulEntries)

    this.emit('pushCompleted')

    return response
  }

  async pullRecords() {
    if (this.currentPull) return this.currentPull

    this.currentPull = (async () => {
      const lastFetchToken = await this.getLastFetchToken()
      const response = await this.puller(lastFetchToken, this.runScope.signal)

      if (response.success) {
        await this.write(response.entries, !response.previousToken)
        await this.setLastFetchToken(response.token)
      }

      this.emit('pullCompleted')

      return response
    })()

    try {
      return await this.currentPull
    } finally {
      this.currentPull = null
    }
  }

  async readAll() {
    const records = await this.queryRecords();
    return records.map(record => this.modelSerializer.toPlainObject(record))
  }

  async readSome(ids: RecordId[]) {
    const records = await this.queryRecords(Q.where('id', Q.oneOf(ids)));
    return records.map(record => this.modelSerializer.toPlainObject(record))
  }

  async readOne(id: RecordId) {
    const record = await this.queryRecord(id);
    return record ? this.modelSerializer.toPlainObject(record) : null
  }

  private async queryRecords(...args: Q.Clause[]) {
    return await this.collection.query(...args).fetch()
  }

  // excludes deleted records
  private async queryRecord(id: RecordId) {
    return this.collection
      .query(Q.where('id', id))
      .fetch()
      .then(records => records[0] as TModel | null)
  }

  // considers soft-deleted
  private async findRecord(id: RecordId) {
    return this.collection.find(id).catch(err => {
      if (err.message === `Record ${this.collection.table}#${id} not found`) {
        return null
      } else {
        throw err
      }
    })
  }

  // considers soft-deleted
  private async findRecords(ids: RecordId[]) {
    const serializedQuery = this.collection.query(Q.where('id', Q.oneOf(ids))).serialize()
    const adjustedQuery = {
      ...serializedQuery,
      description: {
        ...serializedQuery.description,
        where: serializedQuery.description.where.filter(
          (w) =>
            !(
              w.type === 'where' &&
              w.left === '_status' &&
              w.comparison &&
              w.comparison.operator === 'notEq' &&
              w.comparison.right &&
              'value' in w.comparison.right && w.comparison.right.value === 'deleted'
            )
        )
      }
    }

    return (await this.db.adapter.unsafeQueryRaw(adjustedQuery)).map(raw => {
      return new this.model(this.collection, sanitizedRaw(raw, this.db.schema.tables[this.collection.table]))
    })
  }

  async upsertOne(id: string, builder: (record: TModel) => void) {
    await this.db.write(async () => {
      const existing = await this.queryRecord(id)

      if (existing) {
        existing.update(builder)
      } else {
        const deletedExisting = await this.findRecord(id)

        if (deletedExisting) {
          await this.db.adapter.destroyDeletedRecords(this.model.table, [id])
        }

        this.collection.create((record) => {
          const now = Math.round(Date.now() / 1000) as EpochSeconds
          record._raw.id = id
          record._raw.created_at = now
          record._raw.updated_at = now
          builder(record)
        })
      }
    })

    return (await this.readOne(id))! // todo - possible race after write?
  }

  async deleteOne(id: RecordId) {
    await this.db.write(async () => {
      const existingUndeleted = await this.queryRecord(id)

      if (existingUndeleted) {
        existingUndeleted.markAsDeleted()
      } else {
        const adapterRecord = await this.findRecord(id)
        if (!adapterRecord) {
          await this.collection.create((record) => {
            const now = Math.round(Date.now() / 1000) as EpochSeconds

            record._raw.id = id
            record._raw.updated_at = now
            record._raw._status = 'deleted'
          })
        }
      }
    })

    return id
  }

  private async write(entries: SyncEntry[], freshSync: boolean = false) {
    await this.withWriteLock(async () => {
      await this.db.write(async (writer) => {
        const batches = await this.buildSyncedRecordsFromEntries(entries, freshSync)

        for (const batch of batches) {
          if (batch.length) {
            await this.runScope.abortable(() => writer.batch(...batch))
          }
        }
      })
    })
  }

  private async withWriteLock(write: () => Promise<void>) {
    // no-op
    // on web, could use navigator.locks, but only useful if loki flushed immediately (in-band) to indexeddb
    // so handled by other measures/capitulations, hopefully
    // on app, only one instance of sqlite, so nothing necessary here
    return write()
  }

  private async buildSyncedRecordsFromEntries(entries: SyncEntry[], freshSync: boolean) {
    const existingRecordsMap = new Map<RecordId, TModel>()

    const entryIds = entries.map(e => e.meta.ids.id)

    // todo - verify we don't need callReader behavior here
    const [undeletedRecords, deletedRecords] = await Promise.all([
      this.collection.query(Q.where('id', Q.oneOf(entryIds))).fetch(),
      this.findRecords(entryIds)
    ])

    undeletedRecords.forEach(record => existingRecordsMap.set(record.id, record))
    deletedRecords.forEach(record => existingRecordsMap.set(record.id, record))

    // if this is a fresh sync and there are no existing records, we can skip more sophisticated conflict resolution
    const [entriesToCreate, tuplesToUpdate, tuplesToRestore, idsToDestroy] =
      freshSync && existingRecordsMap.size === 0
        ? [entries.filter((e) => !e.meta.lifecycle.deleted_at), [], [], []]
        : entries.reduce<[SyncEntry[], [TModel, SyncEntry][], [TModel, SyncEntry][], RecordId[]]>(
            (acc, entry) => {
              const resolver = new this.Resolver({
                createRecord: (entry) => acc[0].push(entry),
                updateRecord: (existing, entry) => acc[1].push([existing, entry]),
                restoreRecord: (existing, entry) => acc[2].push([existing, entry]),
                destroyRecord: (id) => acc[3].push(id),
              })

              const existing = existingRecordsMap.get(entry.meta.ids.id)
              if (existing) {
                switch (existing._raw._status) {
                  case 'updated':
                    resolver.againstDirty(existing, entry)
                    break

                  case 'created':
                  case 'synced':
                    resolver.againstClean(existing, entry)
                    break

                  case 'deleted':
                    resolver.againstDeleted(existing, entry);
                    break;

                  default:
                    throw new Error('SyncStore.buildSyncedRecordsFromEntries: unknown record status')
                }
              } else {
                resolver.againstNone(entry)
              }
              return acc
            },
            [[], [], [], []]
          )

    const destroyedBuilds = idsToDestroy.map(id => {
      return new this.model(this.collection, { id }).prepareDestroyPermanently()
    })
    const createdBuilds = entriesToCreate.map((entry) => {
      return this.collection.prepareCreate((r) => {
        Object.entries(entry.record!).forEach(([key, value]) => {
          if (key === 'id') r._raw.id = value.toString()
          else r._raw[key] = value
        })
        r._raw['created_at'] = entry.meta.lifecycle.created_at
        r._raw['updated_at'] = entry.meta.lifecycle.updated_at

        r._raw._status = 'synced'
        r._raw._changed = ''
      })
    })
    const updatedBuilds = [...tuplesToUpdate, ...tuplesToRestore].map(([record, entry]) => {
      return record.prepareUpdate((r) => {
        Object.entries(entry.record!).forEach(([key, value]) => {
          if (key !== 'id') r._raw[key] = value
        })
        r._raw['created_at'] = entry.meta.lifecycle.created_at
        r._raw['updated_at'] = entry.meta.lifecycle.updated_at

        r._raw._status = 'synced'
        r._raw._changed = ''
      })
    })

    const restoreDestroyBuilds = tuplesToRestore.map(([model]) => {
      return new this.model(this.collection, { id: model.id }).prepareDestroyPermanently()
    })
    const restoreCreateBuilds = tuplesToRestore.map(([_model, entry]) => {
      return this.collection.prepareCreate((r) => {
        Object.entries(entry.record!).forEach(([key, value]) => {
          if (key === 'id') r._raw.id = value.toString()
          else r._raw[key] = value
        })
        r._raw['created_at'] = entry.meta.lifecycle.created_at
        r._raw['updated_at'] = entry.meta.lifecycle.updated_at

        r._raw._status = 'synced'
        r._raw._changed = ''
      })
    })

    return [
      [...destroyedBuilds, ...createdBuilds, ...updatedBuilds, ...restoreDestroyBuilds],
      [...restoreCreateBuilds]
    ]
  }
}
