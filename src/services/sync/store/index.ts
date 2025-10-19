import { Database, Q, type Collection, type RecordId } from '@nozbe/watermelondb'
import { RawSerializer, ModelSerializer } from '../serializers'
import { ModelClass, SyncToken, SyncEntry,  SyncContext } from '..'
import { SyncPullResponse, SyncPushResponse, PushPayload } from '../fetch'
import type SyncRetry from '../retry'
import type SyncRunScope from '../run-scope'
import EventEmitter from '../utils/event-emitter'
import BaseModel from '../models/Base'
import { EpochSeconds } from '../utils/epoch'
import { sanitizedRaw } from '@nozbe/watermelondb/RawRecord'
import { default as Resolver, type SyncResolution } from '../resolver'
import PushCoalescer from './push-coalescer'
import { SyncTelemetry, Span } from '../telemetry/index'
import { inBoundary } from '../errors/boundary'
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs'
import { BaseSessionProvider } from '../context/providers'
import { dropThrottle, queueThrottle, createThrottleState, type ThrottleState } from '../utils'
import { WriterInterface } from '@nozbe/watermelondb/Database/WorkQueue'

type SyncPull = (
  session: BaseSessionProvider,
  previousFetchToken: SyncToken | null,
  signal: AbortSignal
) => Promise<SyncPullResponse>
type SyncPush = (
  session: BaseSessionProvider,
  payload: PushPayload,
  signal: AbortSignal
) => Promise<SyncPushResponse>

export type SyncStoreConfig<TModel extends BaseModel = BaseModel> = {
  model: ModelClass<TModel>
  pull: SyncPull
  push: SyncPush
}

export default class SyncStore<TModel extends BaseModel = BaseModel> {
  static readonly PULL_THROTTLE_INTERVAL = 2_000
  static readonly PUSH_THROTTLE_INTERVAL = 1_000

  readonly telemetry: SyncTelemetry
  readonly context: SyncContext
  readonly retry: SyncRetry
  readonly runScope: SyncRunScope
  readonly db: Database
  readonly model: ModelClass<TModel>
  readonly collection: Collection<TModel>

  readonly rawSerializer: RawSerializer<TModel>
  readonly modelSerializer: ModelSerializer<TModel>

  readonly puller: SyncPull
  readonly pusher: SyncPush

  private pullThrottleState: ThrottleState<SyncPullResponse>
  private pushThrottleState: ThrottleState<SyncPushResponse>
  private pushCoalescer = new PushCoalescer()

  private emitter = new EventEmitter()

  private lastFetchTokenKey: string

  constructor(
    { model, pull, push }: SyncStoreConfig<TModel>,
    context: SyncContext,
    db: Database,
    retry: SyncRetry,
    runScope: SyncRunScope,
    telemetry: SyncTelemetry
  ) {
    this.context = context
    this.retry = retry
    this.runScope = runScope
    this.db = db
    this.model = model
    this.collection = db.collections.get(model.table)
    this.rawSerializer = new RawSerializer()
    this.modelSerializer = new ModelSerializer()

    this.pushCoalescer = new PushCoalescer()
    this.pushThrottleState = createThrottleState(SyncStore.PUSH_THROTTLE_INTERVAL)
    this.pullThrottleState = createThrottleState(SyncStore.PULL_THROTTLE_INTERVAL)

    this.puller = pull
    this.pusher = push
    this.lastFetchTokenKey = `last_fetch_token:${this.model.table}`

    this.telemetry = telemetry
  }

  on = this.emitter.on.bind(this.emitter)
  off = this.emitter.off.bind(this.emitter)
  private emit = this.emitter.emit.bind(this.emitter)

  async sync(reason: string) {
    inBoundary(ctx => {
      this.telemetry.trace(
        { name: `sync:${this.model.table}`, op: 'sync', attributes: ctx },
        async span => {
          let pushError: any = null

          try {
            await this.pushUnsyncedWithRetry(span)
          } catch (err) {
            pushError = err
          }

          // will return records that we just saw in push response, but we can't
          // be sure there were no other changes before the push
          await this.pullRecordsWithRetry(span)

          if (pushError) {
            throw pushError
          }
        }
      )
    }, { table: this.model.table, reason })
  }

  async getLastFetchToken() {
    return (await this.db.localStorage.get<SyncToken | null>(this.lastFetchTokenKey)) ?? null
  }

  async pullRecords(span?: Span) {
    return dropThrottle({ state: this.pullThrottleState }, this.executePull.bind(this))(span)
  }

  async pushRecordIdsImpatiently(ids: RecordId[], span?: Span) {
    const records = await this.queryMaybeDeletedRecords(Q.where('id', Q.oneOf(ids)))

    return await this.pushCoalescer.push(
      records,
      queueThrottle({ state: this.pushThrottleState }, () => {
        return this.executePush(records, span)
      })
    )
  }

  async readAll() {
    const records = await this.queryRecords()
    return records.map((record) => this.modelSerializer.toPlainObject(record))
  }

  async readSome(ids: RecordId[]) {
    const records = await this.queryRecords(Q.where('id', Q.oneOf(ids)))
    return records.map((record) => this.modelSerializer.toPlainObject(record))
  }

  async readOne(id: RecordId) {
    const record = await this.findRecord(id)
    return record ? this.modelSerializer.toPlainObject(record) : null
  }

  async queryAll(...args: Q.Clause[]) {
    const records = await this.queryRecords(...args)
    return records.map((record) => this.modelSerializer.toPlainObject(record))
  }

  async queryAllIds(...args: Q.Clause[]) {
    return this.queryRecordIds(...args)
  }

  async queryOne(...args: Q.Clause[]) {
    const record = await this.queryRecord(...args)
    return record ? this.modelSerializer.toPlainObject(record) : null
  }

  async queryOneId(...args: Q.Clause[]) {
    return this.queryRecordId(...args)
  }

  async updateOne(id: RecordId, builder: (record: TModel) => void, span?: Span) {
    return await this.runScope.abortable(async () => {
      let record: TModel | null = null

      await this.telemeterizedWrite(span, async () => {
        const existing = await this.queryMaybeDeletedRecords(Q.where('id', id)).then(
          (records) => records[0] || null
        )

        // todo - verify if need deleted check
        if (existing && existing._raw._status !== 'deleted') {
          await existing.update(builder)
          record = existing
        }
      })

      this.emit('write', [record])

      this.pushUnsyncedWithRetry(span)
      await this.ensurePersistence()

      return this.modelSerializer.toPlainObject(record!)
    })
  }

  async upsertSome(builders: Record<RecordId, (record: TModel) => void>, span?: Span) {
    if (Object.keys(builders).length === 0) return []

    return await this.runScope.abortable(async () => {
      const ids = Object.keys(builders)

      const records = await this.telemeterizedWrite(span, async writer => {
        const existing = await this.queryMaybeDeletedRecords(Q.where('id', Q.oneOf(ids)))
        const existingMap = existing.reduce((map, record) => map.set(record.id, record), new Map<RecordId, TModel>())

        const destroyedBuilds = existing.filter(record => record._raw._status === 'deleted').map(record => {
          return new this.model(this.collection, { id: record.id }).prepareDestroyPermanently()
        })
        const newBuilds = Object.entries(builders).map(([id, builder]) => {
          const existing = existingMap.get(id)

          if (existing && existing._raw._status !== 'deleted') {
            return existing.prepareUpdate(builder)
          } else {
            return this.collection.prepareCreate(record => {
              const now = this.generateTimestamp()

              record._raw.id = id
              record._raw.created_at = now
              record._raw.updated_at = now
              builder(record)
            })
          }
        })

        await writer.batch(...destroyedBuilds)
        await writer.batch(...newBuilds)

        return newBuilds
      })

      this.emit('write', records)

      this.pushUnsyncedWithRetry(span)
      await this.ensurePersistence()

      return records.map((record) => this.modelSerializer.toPlainObject(record))
    })
  }

  async upsertSomeOptimistic(builders: Record<RecordId, (record: TModel) => void>, span?: Span) {
    return this.upsertSome(Object.fromEntries(Object.entries(builders).map(([id, builder]) => [id, record => {
      builder(record)
      record.buildMarkAsOptimistic()
    }])), span)
  }

  async upsertOne(id: RecordId, builder: (record: TModel) => void, span?: Span) {
    return this.upsertSome({ [id]: builder }, span).then(r => r[0])
  }

  async upsertOneOptimistic(id: string, builder: (record: TModel) => void, span?: Span) {
    return this.upsertOne(id, record => {
      builder(record)
      record.buildMarkAsOptimistic()
    }, span)
  }

  async deleteOne(id: RecordId, span?: Span) {
    return await this.runScope.abortable(async () => {
      let record: TModel | null = null

      await this.telemeterizedWrite(span, async () => {
        const existing = await this.queryMaybeDeletedRecords(Q.where('id', id)).then(
          (records) => records[0] || null
        )

        if (existing && existing._raw._status !== 'deleted') {
          await existing.markAsDeleted()
          record = existing
        } else {
          record = await this.collection.create((record) => {
            const now = this.generateTimestamp()

            record._raw.id = id
            record._raw.updated_at = now
            record._raw._status = 'deleted'
          })
        }
      })

      this.emit('write', [record])

      this.pushUnsyncedWithRetry(span)
      await this.ensurePersistence()

      return id
    })
  }

  async importRaw(recordRaws: TModel['_raw'][]) {
    await this.runScope.abortable(async () => {
      await this.db.write(async () => {
        const ids = recordRaws.map(r => r.id)
        const existingMap = await this.queryMaybeDeletedRecords(Q.where('id', Q.oneOf(ids))).then(records => {
          return records.reduce((map, record) => map.set(record.id, record), new Map<RecordId, TModel>())
        })

        recordRaws.forEach(recordRaw => {
          const existing = existingMap.get(recordRaw.id)

          if (existing) {
            if (existing._raw._status === 'deleted') {
              if (recordRaw._status !== 'deleted') {
                // todo - resurrect
              }
            } else {
              if (recordRaw._status === 'deleted') {
                existing.prepareMarkAsDeleted()
              } else {
                existing.prepareUpdate((record) => {
                  Object.keys(recordRaw).forEach((key) => {
                    record._raw[key] = recordRaw[key]
                  })
                })
              }
            }
          } else {
            if (recordRaw._status === 'deleted') {
              this.collection.prepareCreate((record) => {
                const now = this.generateTimestamp()

                record._raw.id = recordRaw.id
                record._raw.updated_at = now
                record._raw._status = 'deleted'
              })
            } else {
              this.collection.prepareCreate((record) => {
                Object.keys(recordRaw).forEach((key) => {
                  record._raw[key] = recordRaw[key]
                })
              })
            }
          }
        });
      })
    })
  }

  private async setLastFetchToken(token: SyncToken | null) {
    await this.db.write(async () => {
      if (token) {
        const storedValue = await this.getLastFetchToken()

        // avoids thrashing if we get and compare first before setting
        if (storedValue !== token) {
          this.telemetry.debug(`[store:${this.model.table}] Setting last fetch token: ${token}`)
          return this.db.localStorage.set(this.lastFetchTokenKey, token)
        }
      } else {
        this.telemetry.debug(`[store:${this.model.table}] Removing last fetch token`)
        return this.db.localStorage.remove(this.lastFetchTokenKey)
      }
    })
  }

  private async pullRecordsWithRetry(span?: Span) {
    dropThrottle({ state: this.pullThrottleState, deferOnce: true }, () =>
      this.retry.request(
        { name: `pull:${this.model.table}`, op: 'pull', parentSpan: span },
        (span) => this.executePull(span)
      )
    )()
  }

  private async pushUnsyncedWithRetry(span?: Span) {
    const records = await this.queryMaybeDeletedRecords(Q.where('_status', Q.notEq('synced')))

    if (records.length) {
      this.pushCoalescer.push(
        records,
        queueThrottle({ state: this.pushThrottleState }, () => {
          return this.retry.request(
            { name: `push:${this.model.table}`, op: 'push', parentSpan: span },
            (span) => this.executePush(records, span)
          )
        })
      )
    }
  }

  private async executePull(span?: Span) {
    return this.telemetry.trace(
      {
        name: `pull:${this.model.table}:run`,
        op: 'pull:run',
        attributes: { table: this.model.table },
        parentSpan: span,
      },
      async (pullSpan) => {
        const lastFetchToken = await this.getLastFetchToken()

        const response = await this.telemetry.trace(
          {
            name: `pull:${this.model.table}:run:fetch`,
            op: 'pull:run:fetch',
            attributes: { lastFetchToken: lastFetchToken ?? undefined },
            parentSpan: pullSpan,
          },
          () => this.puller(this.context.session, lastFetchToken, this.runScope.signal)
        )

        if (response.ok) {
          await this.writeEntries(response.entries, !response.previousToken, pullSpan)
          await this.setLastFetchToken(response.token)

          this.emit('pullCompleted')
        }

        return response
      }
    )
  }

  private async executePush(records: TModel[], parentSpan?: Span) {
    return this.telemetry.trace(
      {
        name: `push:${this.model.table}`,
        op: 'push:run',
        attributes: { table: this.model.table },
        parentSpan,
      },
      async (pushSpan) => {
        const payload = this.generatePushPayload(records)

        const response = await this.telemetry.trace(
          {
            name: `push:${this.model.table}:run:fetch`,
            op: 'push:run:fetch',
            parentSpan: pushSpan,
          },
          () => this.pusher(this.context.session, payload, this.runScope.signal)
        )

        if (response.ok) {
          const successfulResults = response.results.filter((result) => result.type === 'success')
          const successfulEntries = successfulResults.map((result) => result.entry)
          await this.writeEntries(successfulEntries, false, pushSpan)

          this.emit('pushCompleted')
        }

        return response
      }
    )
  }

  private generatePushPayload(records: TModel[]) {
    const entries = records.map((rec) => {
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

  private async queryRecords(...args: Q.Clause[]) {
    return await this.collection.query(...args).fetch()
  }

  private async queryRecordIds(...args: Q.Clause[]) {
    return await this.collection.query(...args).fetchIds()
  }

  private async queryRecord(...args: Q.Clause[]) {
    return await this.collection.query(Q.take(1), ...args).fetch().then((records) => records[0] as TModel | null)
  }

  private async queryRecordId(...args: Q.Clause[]) {
    return await this.collection.query(Q.take(1), ...args).fetchIds().then((ids) => ids[0] as RecordId | null)
  }

  private async findRecord(id: RecordId) {
    return this.collection
      .query(Q.where('id', id))
      .fetch()
      .then((records) => records[0] as TModel | null)
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
              'value' in w.comparison.right &&
              w.comparison.right.value === 'deleted'
            )
        ),
      },
    }

    return (await this.db.adapter.unsafeQueryRaw(adjustedQuery)).map((raw) => {
      return new this.model(
        this.collection,
        sanitizedRaw(raw, this.db.schema.tables[this.collection.table])
      )
    })
  }

  // Avoid lazy persistence to IndexedDB
  // to eliminate data loss risk due to tab close/crash before flush to IndexedDB
  // NOTE: does NOT go through watermelon, so this might be dangerous?
  private async ensurePersistence() {
    return new Promise<void>((resolve, reject) => {
      if (this.db.adapter.underlyingAdapter instanceof LokiJSAdapter) {
        this.db.adapter.underlyingAdapter._driver.loki.saveDatabase((err) => {
          if (err) {
            reject(err)
          } else {
            resolve()
          }
        })
      } else {
        resolve()
      }
    })
  }

  private telemeterizedWrite<T>(
    parentSpan: Span | undefined,
    work: (writer: WriterInterface) => Promise<T>
  ): Promise<T> {
    return this.telemetry.trace(
      { name: `write:${this.model.table}`, op: 'write', parentSpan },
      (writeSpan) => {
        return this.db.write(writer =>
          this.telemetry.trace(
            {
              name: `write:generate:${this.model.table}`,
              op: 'write:generate',
              parentSpan: writeSpan,
            },
            () => work(writer)
          )
        )
      }
    )
  }

  private async writeEntries(entries: SyncEntry[], freshSync: boolean = false, parentSpan?: Span) {
    await this.runScope.abortable(async () => {
      return this.telemeterizedWrite(parentSpan, async (writer) => {
        const batches = await this.buildWriteBatchesFromEntries(entries, freshSync)

        for (const batch of batches) {
          if (batch.length) {
            await writer.batch(...batch)
          }
        }
      })
    })
  }

  private async buildWriteBatchesFromEntries(entries: SyncEntry[], freshSync: boolean) {
    // if this is a fresh sync and there are no existing records, we can skip more sophisticated conflict resolution
    if (freshSync) {
      if ((await this.queryMaybeDeletedRecords()).length === 0) {
        const resolver = new Resolver()
        entries
          .filter((e) => !e.meta.lifecycle.deleted_at)
          .forEach((entry) => resolver.againstNone(entry))

        return this.prepareRecords(resolver.result)
      }
    }

    const entryIds = entries.map((e) => e.meta.ids.id)
    const existingRecordsMap = new Map<RecordId, TModel>()

    const existingRecords = await this.queryMaybeDeletedRecords(Q.where('id', Q.oneOf(entryIds)))
    existingRecords.forEach((record) => existingRecordsMap.set(record.id, record))

    const resolver = new Resolver()

    entries.forEach((entry) => {
      const existing = existingRecordsMap.get(entry.meta.ids.id)
      if (existing) {
        switch (existing._raw._status) {
          case 'created':
            resolver.againstCreated(existing, entry)
            break

          case 'updated':
            resolver.againstUpdated(existing, entry)
            break

          case 'synced':
            resolver.againstSynced(existing, entry)
            break

          case 'deleted':
            resolver.againstDeleted(existing, entry)
            break

          default:
            this.telemetry.error(`[store:${this.model.table}] Unknown record status`, {
              status: existing._raw._status,
            })
        }
      } else {
        resolver.againstNone(entry)
      }
    })

    return this.prepareRecords(resolver.result)
  }

  private prepareRecords(result: SyncResolution) {
    if (Object.values(result).find((c) => c.length)) {
      this.telemetry.debug(`[store:${this.model.table}] Writing changes`, { changes: result })
    }

    const destroyedBuilds = result.idsForDestroy.map((id) => {
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
      [...restoreCreateBuilds],
    ]
  }

  private generateTimestamp() {
    return Math.round(Date.now() / 1000) as EpochSeconds
  }
}
