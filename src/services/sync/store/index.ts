import { Database, Q, type Collection, type Model, type RecordId } from '@nozbe/watermelondb'
import { RawSerializer, ModelSerializer } from '../serializers'
import { SyncToken, SyncEntry, SyncError } from '..'
import { SyncPullResponse, SyncPushResponse, PushPayload } from '../fetch'
import type SyncRetry from '../retry'
import type SyncRunScope from '../run-scope'
import { EventEmitter } from '../utils/event-emitter'
import BaseModel from '../models/Base'
import { EpochSeconds } from '../utils/epoch'
import { sanitizedRaw } from '@nozbe/watermelondb/RawRecord'
import { default as Resolver, type SyncResolution } from '../resolver'
import PushCoalescer from './push-coalescer'
import telemetry from '../telemetry'
import { SyncStoreError } from '../errors'

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

  readonly retry: SyncRetry
  readonly runScope: SyncRunScope
  readonly db: Database
  readonly model: ModelClass<TModel>
  readonly collection: Collection<TModel>

  readonly rawSerializer: RawSerializer<TModel>
  readonly modelSerializer: ModelSerializer<TModel>

  readonly puller: SyncPull
  readonly pusher: SyncPush

  private pushCoalescer = new PushCoalescer()
  private currentPull: Promise<SyncPullResponse> | null = null

  private emitter = new EventEmitter()

  private lastFetchTokenKey: string

  constructor({
    model,
    pull,
    push,
  }: SyncStoreConfig<TModel>, db: Database, retry: SyncRetry, runScope: SyncRunScope) {
    this.retry = retry
    this.runScope = runScope
    this.db = db
    this.model = model
    this.collection = db.collections.get(model.table)
    this.rawSerializer = new RawSerializer()
    this.modelSerializer = new ModelSerializer()
    this.pushCoalescer = new PushCoalescer()

    this.puller = pull
    this.pusher = push
    this.lastFetchTokenKey = `last_fetch_token:${this.model.table}`
  }

  on = this.emitter.on.bind(this.emitter)
  off = this.emitter.off.bind(this.emitter)
  private emit = this.emitter.emit.bind(this.emitter)

  async sync(reason: string) {
    telemetry.debug(`[store:${this.model.table}] Attempting sync from: "${reason}"`)

    let pushError: any = null

    try {
      await this.pushUnsynced()
    } catch (err) {
      pushError = err
    }

    // will return records that we just saw in push response, but we can't
    // be sure there were no other changes before the push
    await this.pullRecords()

    if (pushError) {
      throw pushError
    }
  }

  async getLastFetchToken() {
    return (await this.db.localStorage.get<SyncToken | null>(this.lastFetchTokenKey)) ?? null
  }

  private async setLastFetchToken(token: SyncToken | null) {
    if (token) {
      const storedValue = await this.getLastFetchToken()

      if (storedValue !== token) {
        telemetry.debug(`[store:${this.model.table}] Setting last fetch token: ${token}`)
        return this.db.localStorage.set(this.lastFetchTokenKey, token)
      }
    } else {
      telemetry.debug(`[store:${this.model.table}] Removing last fetch token`)
      return this.db.localStorage.remove(this.lastFetchTokenKey)
    }
  }

  private async pushUnsynced() {
    const records = await this.queryMaybeDeletedRecords(Q.where('_status', Q.notEq('synced')))

    if (records.length) {
      await this.pushRecords(records)
    }
  }

  private async pushRecords(records: TModel[]) {
    return this.pushCoalescer.push(records, this.makePush.bind(this))
  }

  private async makePush(records: TModel[]) {
    const payload = this.generatePushPayload(records)

    const response = await this.retry.request<SyncPushResponse>(() => this.pusher(payload, this.runScope.signal))

    if (response.ok) {
      const successfulResults = response.results.filter(result => result.type === 'success')
      const successfulEntries = successfulResults.map(result => result.entry)
      await this.writeEntries(successfulEntries)

      this.emit('pushCompleted')
    }

    return response
  }

  private generatePushPayload(records: TModel[]) {
    const entries = records.map(rec => {
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
    })
    return {
      entries,
    }
  }

  async pullRecords() {
    return await this.retry.request<SyncPullResponse>(() => this.getCurrentPull())
  }

  private async getCurrentPull() {
    if (this.currentPull) return this.currentPull

    this.currentPull = (async () => {
      const lastFetchToken = await this.getLastFetchToken()
      const response = await this.puller(lastFetchToken, this.runScope.signal)

      if (response.ok) {
        await this.writeEntries(response.entries, !response.previousToken)
        await this.setLastFetchToken(response.token)

        this.emit('pullCompleted')
      }

      return response
    })()

    try {
      return await this.currentPull
    } finally {
      this.currentPull = null
    }
  }

  async pullRecordsAggressive() {
    const pull = await this.retry.request<SyncPullResponse>(() => this.getCurrentPull(), 1)

    if (!pull.ok) {
      throw new SyncStoreError('Failed to pull records', this, { pull })
    }
    return pull
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

  private async queryRecord(id: RecordId) {
    return this.collection
      .query(Q.where('id', id))
      .fetch()
      .then(records => records[0] as TModel | null)
  }

  private async queryMaybeDeletedRecords(...args: Q.Clause[]) {
    const serializedQuery = this.collection.query(...args).serialize()
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
    let record: TModel | null = null

    await this.db.write(async () => {
      const existing = await this.queryMaybeDeletedRecords(Q.where('id', id)).then(records => records[0] || null)

      if (existing) {
        if (existing._raw._status === 'deleted') {
          await existing.destroyPermanently()
        } else {
          await existing.update(builder)
        }
      } else {
        await this.collection.create((record) => {
          const now = this.generateTimestamp()
          record._raw.id = id
          record._raw.created_at = now
          record._raw.updated_at = now
          builder(record)
        })
      }

      record = await this.queryRecord(id)
    })

    this.pushUnsynced()
    return this.modelSerializer.toPlainObject(record!)
  }

  async deleteOne(id: RecordId) {
    await this.db.write(async () => {
      const existing = await this.queryMaybeDeletedRecords(Q.where('id', id)).then(records => records[0] || null)

      if (existing && existing._raw._status !== 'deleted') {
        await existing.markAsDeleted()
      } else {
        await this.collection.create(record => {
          const now = this.generateTimestamp()

          record._raw.id = id
          record._raw.updated_at = now
          record._raw._status = 'deleted'
        })
      }
    })

    this.pushUnsynced()
    return id
  }

  private async writeEntries(entries: SyncEntry[], freshSync: boolean = false) {
    await this.withWriteLock(async () => {
      await this.db.write(async (writer) => {
        const batches = await this.buildWriteBatchesFromEntries(entries, freshSync)

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

  private async buildWriteBatchesFromEntries(entries: SyncEntry[], freshSync: boolean) {
    // if this is a fresh sync and there are no existing records, we can skip more sophisticated conflict resolution
    if (freshSync) {
      const resolver = new Resolver();
      entries.filter((e) => !e.meta.lifecycle.deleted_at).forEach(entry => resolver.againstNone(entry))

      return this.prepareRecords(resolver.result)
    }

    const entryIds = entries.map(e => e.meta.ids.id)
    const existingRecordsMap = new Map<RecordId, TModel>()

    const existingRecords = await this.queryMaybeDeletedRecords(Q.where('id', Q.oneOf(entryIds)))
    existingRecords.forEach(record => existingRecordsMap.set(record.id, record))

    const resolver = new Resolver()

    entries.forEach(entry => {
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
            throw new SyncStoreError('Unknown record status', this, { status: existing._raw._status })
        }
      } else {
        resolver.againstNone(entry)
      }
    })

    return this.prepareRecords(resolver.result);
  }

  private prepareRecords(result: SyncResolution) {
    if (Object.values(result).find(c => c.length)) {
      telemetry.debug(`[store:${this.model.table}] Writing changes`, { changes: result })
    }

    const destroyedBuilds = result.idsForDestroy.map(id => {
      return new this.model(this.collection, { id }).prepareDestroyPermanently()
    })
    const createdBuilds = result.entriesForCreate.map((entry) => {
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
    const updatedBuilds = result.tuplesForUpdate.map(([record, entry]) => {
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

    const restoreDestroyBuilds = result.tuplesForRestore.map(([model]) => {
      return new this.model(this.collection, { id: model.id }).prepareDestroyPermanently()
    })
    const restoreCreateBuilds = result.tuplesForRestore.map(([_model, entry]) => {
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

  private generateTimestamp() {
    return Math.round(Date.now() / 1000) as EpochSeconds
  }
}
