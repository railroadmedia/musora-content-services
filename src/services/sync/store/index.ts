import { Database, Q, Query, type Collection, type RecordId } from '@nozbe/watermelondb'
import { RawSerializer, ModelSerializer } from '../serializers'
import { ModelClass, SyncToken, SyncEntry, SyncUserScope, SyncContext, EpochMs } from '..'
import { SyncPullResponse, SyncPushResponse, SyncPullFetchFailureResponse, PushPayload, SyncStorePushResultSuccess, SyncStorePushResultFailure } from '../fetch'
import type SyncRetry from '../retry'
import type SyncRunScope from '../run-scope'
import EventEmitter from '../utils/event-emitter'
import BaseModel from '../models/Base'
import { sanitizedRaw } from '@nozbe/watermelondb/RawRecord'
import { default as Resolver, type SyncResolution, type SyncResolverComparator } from '../resolver'
import PushCoalescer from './push-coalescer'
import { SyncTelemetry, Span } from '../telemetry/index'
import { inBoundary } from '../errors/boundary'
import { BaseSessionProvider } from '../context/providers'
import { dropThrottle, queueThrottle, createThrottleState, type ThrottleState } from '../utils'
import { type WriterInterface } from '@nozbe/watermelondb/Database/WorkQueue'
import type LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs'
import { SyncError } from '../errors'

type SyncPull = (
  intendedUserId: number,
  session: BaseSessionProvider,
  previousFetchToken: SyncToken | null,
  signal: AbortSignal
) => Promise<SyncPullResponse>
type SyncPush = (
  intendedUserId: number,
  session: BaseSessionProvider,
  payload: PushPayload,
  signal: AbortSignal
) => Promise<SyncPushResponse>

export type SyncStoreConfig<TModel extends BaseModel = BaseModel> = {
  model: ModelClass<TModel>
  comparator?: TModel extends BaseModel ? SyncResolverComparator<TModel> : SyncResolverComparator
  pull: SyncPull
  push: SyncPush
}

export default class SyncStore<TModel extends BaseModel = BaseModel> {
  static readonly PULL_THROTTLE_INTERVAL = 2_000
  static readonly PUSH_THROTTLE_INTERVAL = 1_000
  static readonly DELETED_RECORD_GRACE_PERIOD = 60_000 // 60s
  static readonly CLEANUP_INTERVAL = 60_000 * 60 // 1hr

  readonly telemetry: SyncTelemetry
  readonly userScope: SyncUserScope
  readonly context: SyncContext
  readonly retry: SyncRetry
  readonly runScope: SyncRunScope
  readonly db: Database
  readonly model: ModelClass<TModel>
  readonly collection: Collection<TModel>

  readonly resolverComparator?: SyncResolverComparator
  readonly rawSerializer: RawSerializer<TModel>
  readonly modelSerializer: ModelSerializer<TModel>

  readonly puller: SyncPull
  readonly pusher: SyncPush

  private pullThrottleState: ThrottleState<SyncPullResponse>
  private pushThrottleState: ThrottleState<SyncPushResponse>
  private pushCoalescer = new PushCoalescer()

  private emitter = new EventEmitter()
  private cleanupTimer: NodeJS.Timeout | null = null

  private lastFetchTokenKey: string

  constructor(
    { model, comparator, pull, push }: SyncStoreConfig<TModel>,
    userScope: SyncUserScope,
    context: SyncContext,
    db: Database,
    retry: SyncRetry,
    runScope: SyncRunScope,
    telemetry: SyncTelemetry
  ) {
    this.userScope = userScope
    this.context = context
    this.retry = retry
    this.runScope = runScope
    this.db = db
    this.model = model
    this.collection = db.collections.get(model.table)
    this.rawSerializer = new RawSerializer()
    this.modelSerializer = new ModelSerializer()

    this.resolverComparator = comparator

    this.pushCoalescer = new PushCoalescer()
    this.pushThrottleState = createThrottleState(SyncStore.PUSH_THROTTLE_INTERVAL)
    this.pullThrottleState = createThrottleState(SyncStore.PULL_THROTTLE_INTERVAL)

    this.puller = pull
    this.pusher = push
    this.lastFetchTokenKey = `last_fetch_token:${this.model.table}`

    this.telemetry = telemetry

    this.startCleanupTimer()
  }

  on = this.emitter.on.bind(this.emitter)
  off = this.emitter.off.bind(this.emitter)
  private emit = this.emitter.emit.bind(this.emitter)

  destroy() {
    this.stopCleanupTimer()
  }

  async requestSync(reason: string) {
    inBoundary(ctx => {
      this.telemetry.trace(
        { name: `sync:${this.model.table}`, op: 'sync', attributes: { ...ctx, ...this.context.session.toJSON() } },
        async span => {
          let pushError: any = null

          try {
            await this.pushUnsyncedWithRetry(span, { type: 'sync-request', reason })
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

  async requestPush(reason: string) {
    inBoundary(ctx => {
      this.telemetry.trace(
        { name: `sync:${this.model.table}`, op: 'push', attributes: { ...ctx, ...this.context.session.toJSON() } },
        async span => {
          await this.pushUnsyncedWithRetry(span, { type: 'push-request', reason })
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

  async queryAllDeletedIds(...args: Q.Clause[]) {
    return this.queryMaybeDeletedRecordIds(...args)
  }

  async queryOne(...args: Q.Clause[]) {
    const record = await this.queryRecord(...args)
    return record ? this.modelSerializer.toPlainObject(record) : null
  }

  async queryOneId(...args: Q.Clause[]) {
    return this.queryRecordId(...args)
  }

  async insertOne(builder: (record: TModel) => void, span?: Span) {
    return await this.runScope.abortable(async () => {
      const record = await this.paranoidWrite(span, async () => {
        return this.collection.create(rec => {
          builder(rec)
        })
      })
      this.emit('upserted', [record])

      this.pushUnsyncedWithRetry(span, { type: 'insertOne', recordId: record.id })
      await this.ensurePersistence()

      return this.modelSerializer.toPlainObject(record)
    })
  }

  async updateOneId(id: RecordId, builder: (record: TModel) => void, span?: Span) {
    return await this.runScope.abortable(async () => {
      const found = await this.findRecord(id)

      if (!found) {
        throw new SyncError('Record not found', { id })
      }

      const record = await this.paranoidWrite(span, async () => {
        return found.update(builder)
      })
      this.emit('upserted', [record])

      this.pushUnsyncedWithRetry(span, { type: 'updateOneId', recordId: record.id })
      await this.ensurePersistence()

      return this.modelSerializer.toPlainObject(record)
    })
  }

  async upsertSome(builders: Record<RecordId, (record: TModel) => void>, span?: Span, { skipPush = false } = {}) {
    if (Object.keys(builders).length === 0) return []

    return await this.runScope.abortable(async () => {
      const ids = Object.keys(builders)

      const records = await this.paranoidWrite(span, async writer => {
        const existing = await writer.callReader(() => this.queryMaybeDeletedRecords(Q.where('id', Q.oneOf(ids))))
        const existingMap = existing.reduce((map, record) => map.set(record.id, record), new Map<RecordId, TModel>())

        const destroyedBuilds = []
        const recreateBuilds: Array<{ id: RecordId; created_at: EpochMs; builder: (record: TModel) => void }> = []

        existing.forEach(record => {
          if (record._raw._status === 'deleted') {
            destroyedBuilds.push(new this.model(this.collection, { id: record.id }).prepareDestroyPermanently())
          } else if (record._raw._status === 'created' && builders[record.id]) {
            // Workaround for WatermelonDB bug: prepareUpdate() doesn't commit field changes
            // for records with _status='created'. Destroy and recreate to ensure updates persist.
            destroyedBuilds.push(new this.model(this.collection, { id: record.id }).prepareDestroyPermanently())
            recreateBuilds.push({
              id: record.id,
              created_at: record._raw.created_at,
              builder: builders[record.id]
            })
          }
        })

        const newBuilds = Object.entries(builders).map(([id, builder]) => {
          const existing = existingMap.get(id)
          const recreate = recreateBuilds.find(r => r.id === id)

          if (recreate) {
            return this.collection.prepareCreate(record => {
              record._raw.id = id
              record._raw.created_at = recreate.created_at as EpochMs
              record._raw.updated_at = this.generateTimestamp()
              record._raw._status = 'created'
              builder(record)
            })
          } else if (existing && existing._raw._status !== 'deleted' && existing._raw._status !== 'created') {
            return existing.prepareUpdate(builder)
          } else if (!existing || existing._raw._status === 'deleted') {
            return this.collection.prepareCreate(record => {
              const now = this.generateTimestamp()

              record._raw.id = id
              record._raw.created_at = now
              record._raw.updated_at = now
              builder(record)
            })
          }
          return null
        }).filter((build): build is ReturnType<typeof this.collection.prepareCreate> => build !== null)

        await writer.batch(...destroyedBuilds)
        await writer.batch(...newBuilds)

        return newBuilds
      })

      this.emit('upserted', records)

      if (!skipPush) {
        this.pushUnsyncedWithRetry(span, { type: 'upsertSome', recordIds: records.map(r => r.id).join(',') })
      }
      await this.ensurePersistence()

      return records.map((record) => this.modelSerializer.toPlainObject(record))
    })
  }

  async upsertSomeTentative(builders: Record<RecordId, (record: TModel) => void>, span?: Span, { skipPush = false } = {}) {
    return this.upsertSome(Object.fromEntries(Object.entries(builders).map(([id, builder]) => [id, record => {
      builder(record)
      record._raw._status = 'synced'
    }])), span, {skipPush})
  }

  async upsertOne(id: RecordId, builder: (record: TModel) => void, span?: Span, { skipPush = false } = {}) {
    return this.upsertSome({ [id]: builder }, span, {skipPush}).then(r => r[0])
  }

  async upsertOneTentative(id: string, builder: (record: TModel) => void, span?: Span) {
    return this.upsertSomeTentative({ [id]: builder }, span).then(r => r[0])
  }

  async deleteOne(id: RecordId, span?: Span, { skipPush = false } = {}) {
    return await this.runScope.abortable(async () => {
      let record: TModel | null = null

      await this.paranoidWrite(span, async writer => {
        const existing = await writer.callReader(() => this.queryMaybeDeletedRecords(Q.where('id', id))).then(
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

      this.emit('deleted', [id])

      if (!skipPush) {
        this.pushUnsyncedWithRetry(span, { type: 'deleteOne', recordId: id })
      }
      await this.ensurePersistence()

      return id
    })
  }

  async deleteSome(ids: RecordId[], span?: Span, { skipPush = false } = {}) {
    return this.runScope.abortable(async () => {
      await this.paranoidWrite(span, async writer => {
        const existing = await this.queryRecords(Q.where('id', Q.oneOf(ids)))

        await writer.batch(...existing.map(record => record.prepareMarkAsDeleted()))
      })

      this.emit('deleted', ids)

      if (!skipPush) {
        this.pushUnsyncedWithRetry(span, { type: 'deleteSome', recordIds: ids.join(',') })
      }
      await this.ensurePersistence()

      return ids
    })
  }

  async restoreOne(id: RecordId, span?: Span) {
    return this.restoreSome([id], span).then(r => r[0])
  }

  async restoreSome(ids: RecordId[], span?: Span) {
    return this.runScope.abortable(async () => {
      const records = await this.paranoidWrite(span, async writer => {
        const records = await writer.callReader(() => this.queryMaybeDeletedRecords(
          Q.where('id', Q.oneOf(ids)),
          Q.where('_status', 'deleted')
        ))

        const destroyBuilds = records.map(record => new this.model(this.collection, { id: record.id }).prepareDestroyPermanently())
        const createBuilds = records.map(record => this.collection.prepareCreate((r) => {
          Object.keys(record._raw).forEach((key) => {
            r._raw[key] = record._raw[key]
          })
          r._raw._status = 'updated'
        }))

        await writer.batch(...destroyBuilds)
        await writer.batch(...createBuilds)

        return createBuilds
      })

      this.emit('upserted', records)

      this.pushUnsyncedWithRetry(span, { type: 'restoreSome', recordIds: ids.join(',') })
      await this.ensurePersistence()

      return records.map((record) => this.modelSerializer.toPlainObject(record))
    })
  }

  async importUpsert(recordRaws: TModel['_raw'][]) {
    await this.runScope.abortable(async () => {
      await this.paranoidWrite(undefined, async writer => {
        const ids = recordRaws.map(r => r.id)
        const existingMap = await writer.callReader(() => this.queryMaybeDeletedRecords(Q.where('id', Q.oneOf(ids)))).then(records => {
          return records.reduce((map, record) => map.set(record.id, record), new Map<RecordId, TModel>())
        })

        const mainBatch = []
        const destroyBatch = []

        recordRaws.forEach(recordRaw => {
          const existing = existingMap.get(recordRaw.id)

          if (existing) {
            if (existing._raw._status === 'deleted') {
              if (recordRaw._status !== 'deleted') {
                destroyBatch.push(new this.model(this.collection, { id: recordRaw.id }).prepareDestroyPermanently());
                mainBatch.push(this.collection.prepareCreate((record) => {
                  Object.keys(recordRaw).forEach((key) => {
                    record._raw[key] = recordRaw[key]
                  })
                }));
              }
            } else {
              if (recordRaw._status === 'deleted') {
                mainBatch.push(existing.prepareMarkAsDeleted())
              } else {
                mainBatch.push(existing.prepareUpdate((record) => {
                  Object.keys(recordRaw).forEach((key) => {
                    record._raw[key] = recordRaw[key]
                  })
                }))
              }
            }
          } else {
            if (recordRaw._status === 'deleted') {
              mainBatch.push(this.collection.prepareCreate((record) => {
                const now = this.generateTimestamp()

                record._raw.id = recordRaw.id
                record._raw.updated_at = now
                record._raw._status = 'deleted'
              }))
            } else {
              mainBatch.push(this.collection.prepareCreate((record) => {
                Object.keys(recordRaw).forEach((key) => {
                  record._raw[key] = recordRaw[key]
                })
              }))
            }
          }
        });

        await writer.batch(...destroyBatch)
        await writer.batch(...mainBatch)
      })
    })
  }
  async importDeletion(ids: RecordId[]) {
    await this.runScope.abortable(async () => {
      await this.paranoidWrite(undefined, async writer => {
        const existingMap = await writer.callReader(() => this.queryMaybeDeletedRecords(Q.where('id', Q.oneOf(ids)))).then(records => {
          return records.reduce((map, record) => map.set(record.id, record), new Map<RecordId, TModel>())
        })

        const batch = []

        ids.forEach(id => {
          const existing = existingMap.get(id)
          if (existing && existing._raw._status !== 'deleted') {
            batch.push(existing.prepareMarkAsDeleted())
          }
        });

        await writer.batch(...batch)
      })
    })
  }

  private async setLastFetchToken(token: SyncToken | null) {
    await this.runScope.abortable(async () => {
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

  public async pushUnsyncedWithRetry(span?: Span, cause?: string | Record<string, string>) {
    const records = await this.queryMaybeDeletedRecords(Q.where('_status', Q.notEq('synced')))

    if (records.length) {
      const recordIds = records.map(r => r.id)
      const updatedAtMap = new Map<RecordId, EpochMs>()
      records.forEach(record => {
        updatedAtMap.set(record.id, record._raw.updated_at)
      })

      this.pushCoalescer.push(
        records,
        queueThrottle({ state: this.pushThrottleState }, () => {
          const causeAttrs = typeof cause === 'string' ? { type: cause } : cause ?? {}
          return this.retry.request<SyncPushResponse>(
            { name: `push:${this.model.table}`, op: 'push', parentSpan: span, attributes: { ...causeAttrs } },
            async (span) => {
              // re-query records since this fn may be deferred due to throttling/retries
              const currentRecords = await this.queryMaybeDeletedRecords(Q.where('id', Q.oneOf(recordIds)))
              const recordsToPush = currentRecords.filter(r => r._raw.updated_at <= (updatedAtMap.get(r.id) || 0))

              if (!recordsToPush.length) {
                return { ok: true, results: [] }
              }

              return this.executePush(recordsToPush, span)
            }
          )
        })
      )
    }
  }

  private async executePull(span?: Span) {
    if (!this.context.connectivity.getValue()) {
      this.telemetry.debug('[Retry] No connectivity - skipping')
      return { ok: false, failureType: 'fetch', isRetryable: false } as SyncPullFetchFailureResponse
    }

    return this.telemetry.trace(
      {
        name: `pull:${this.model.table}:run`,
        op: 'pull:run',
        attributes: { table: this.model.table, ...this.context.session.toJSON() },
        parentSpan: span,
      },
      async (pullSpan) => {
        const lastFetchToken = await this.getLastFetchToken()

        const response = await this.telemetry.trace(
          {
            name: `pull:${this.model.table}:run:fetch`,
            op: 'pull:run:fetch',
            attributes: { lastFetchToken: lastFetchToken ?? undefined, ...this.context.session.toJSON() },
            parentSpan: pullSpan,
          },
          () => this.puller(this.userScope.initialId, this.context.session, lastFetchToken, this.runScope.signal)
        )

        if (response.ok) {
          const initialId = this.userScope.initialId
          const currentId = this.userScope.getCurrentId()

          if (response.intendedUserId !== initialId || response.intendedUserId !== currentId) {
            throw new SyncError('Intended user ID does not match', {
              intendedUserId: response.intendedUserId,
              initialUserId: initialId,
              currentUserId: currentId
            })
          }

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
        attributes: { table: this.model.table, ...this.context.session.toJSON() },
        parentSpan,
      },
      async (pushSpan) => {
        const payload = this.generatePushPayload(records)

        const response = await this.telemetry.trace(
          {
            name: `push:${this.model.table}:run:fetch`,
            op: 'push:run:fetch',
            attributes: { ...this.context.session.toJSON() },
            parentSpan: pushSpan,
          },
          () => this.pusher(this.userScope.initialId, this.context.session, payload, this.runScope.signal)
        )

        if (response.ok) {
          const [failedResults, successfulResults] = response.results.reduce((acc, result) => {
            if (result.type === 'success') {
              acc[1].push(result)
            } else {
              acc[0].push(result)
            }
            return acc
          }, [[], []] as [SyncStorePushResultFailure[], SyncStorePushResultSuccess[]])

          if (failedResults.length) {
            this.telemetry.warn(
              `[store:${this.model.table}] Push completed with failed records`,
              { results: failedResults, resultsJSON: JSON.stringify(failedResults) }
            )
          }

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

  /**
   * Query records including ones marked as deleted
   * WatermelonDB by default excludes deleted records from queries
   */
  private async queryMaybeDeletedRecords(...args: Q.Clause[]) {
    return this.db.read(async () => {
      const undeletedRecords = await this.collection.query(...args).fetch()

      const adjustedQuery = this.maybeDeletedQuery(this.collection.query(...args))

      // NOTE: constructing models in this way is a bit of a hack,
      // but since deleted records aren't "resurrectable" in WatermelonDB anyway,
      // this should be fine for our use cases of mostly just reading _raw values
      // **If you try to use this pattern to construct records that you intend
      // to call `.update()` on, this won't work like you're expecting**
      const deletedRecords = (await this.db.adapter.unsafeQueryRaw(adjustedQuery)).map((raw) => {
        return new this.model(
          this.collection,
          sanitizedRaw(raw, this.db.schema.tables[this.collection.table])
        )
      })

      return [
        ...undeletedRecords,
        ...deletedRecords,
      ]
    })
  }

  /**
   * Query records including ones marked as deleted
   * WatermelonDB by default excludes deleted records from queries
   */
  private async queryMaybeDeletedRecordIds(...args: Q.Clause[]) {
    return this.db.read(async () => {
      const undeletedRecordIds = await this.collection.query(...args).fetchIds()

      const adjustedQuery = this.maybeDeletedQuery(this.collection.query(...args))
      const deletedRecordIds = (await this.db.adapter.unsafeQueryRaw(adjustedQuery)).map(r => r.id)

      return [
        ...undeletedRecordIds,
        ...deletedRecordIds,
      ]
    })
  }

  private maybeDeletedQuery(query: Query<TModel>) {
    const serializedQuery = query.serialize()
    const adjustedQuery = {
      ...serializedQuery,
      description: {
        ...serializedQuery.description,
        where: [
          // remove the default "not deleted" clause added by WatermelonDB
          ...serializedQuery.description.where.filter(
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

          // and add our own "include deleted" clause
          Q.where('_status', Q.eq('deleted'))
        ],
      },
    }

    return adjustedQuery
  }

  // Avoid lazy persistence to IndexedDB
  // to eliminate data loss risk due to tab close/crash before flush to IndexedDB
  // https://github.com/Nozbe/WatermelonDB/issues/1329
  // NOTE: does NOT go through watermelon, so this might be dangerous?
  private async ensurePersistence() {
    return new Promise<void>((resolve, reject) => {
      if (this.isLokiAdapter(this.db.adapter.underlyingAdapter)) {
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

  /**
   * Performs telemetry-wrapped write, crucially checking if the user has changed
   */
  private paranoidWrite<T>(
    parentSpan: Span | undefined,
    work: (writer: WriterInterface) => Promise<T>
  ): Promise<T> {
    if (this.userScope.initialId !== this.userScope.getCurrentId()) {
      // throw new SyncError('Aborted cross-user write operation') // syncdebug
    }

    return this.telemetry.trace(
      { name: `write:${this.model.table}`, op: 'write', parentSpan, attributes: { ...this.context.session.toJSON() } },
      (writeSpan) => {
        return this.db.write(writer =>
          this.telemetry.trace(
            {
              name: `write:generate:${this.model.table}`,
              op: 'write:generate',
              parentSpan: writeSpan,
              attributes: { ...this.context.session.toJSON() },
            },
            () => work(writer)
          )
        )
      }
    )
  }

  private async writeEntries(entries: SyncEntry[], freshSync: boolean = false, parentSpan?: Span) {
    await this.runScope.abortable(async () => {
      return this.paranoidWrite(parentSpan, async (writer) => {
        const batches = await this.buildWriteBatchesFromEntries(writer, entries, freshSync)

        for (const batch of batches) {
          if (batch.length) {
            await writer.batch(...batch)
          }
        }
      })
    })
  }

  private async buildWriteBatchesFromEntries(writer: WriterInterface, entries: SyncEntry[], freshSync: boolean) {
    // Clean up old deleted records during pull operations
    await this.cleanupOldDeletedRecords(writer)

    // if this is a fresh sync and there are no existing records, we can skip more sophisticated conflict resolution
    if (freshSync) {
      if ((await writer.callReader(() => this.queryMaybeDeletedRecords())).length === 0) {
        const resolver = new Resolver(this.resolverComparator)
        entries
          .filter((e) => !e.meta.lifecycle.deleted_at)
          .forEach((entry) => resolver.againstNone(entry))

        return this.prepareRecords(resolver.result, new Map())
      }
    }

    const entryIds = entries.map((e) => e.meta.ids.id)
    const existingRecordsMap = new Map<RecordId, TModel>()

    const existingRecords = await writer.callReader(() => this.queryMaybeDeletedRecords(Q.where('id', Q.oneOf(entryIds))))
    existingRecords.forEach((record) => existingRecordsMap.set(record.id, record))

    const resolver = new Resolver(this.resolverComparator)

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

    return this.prepareRecords(resolver.result, existingRecordsMap)
  }

  private prepareRecords(result: SyncResolution, existingRecordsMap: Map<RecordId, TModel>) {
    if (Object.values(result).find((c) => c.length)) {
      this.telemetry.debug(`[store:${this.model.table}] Writing changes`, { changes: result })
    }

    const destroyedBuilds = result.idsForDestroy
      .filter(id => {
        // Only permanently delete if updated_at is older than grace period
        const record = existingRecordsMap.get(id)
        if (!record) return true // If no record found, safe to destroy

        const gracePeriodAgo = Date.now() - SyncStore.DELETED_RECORD_GRACE_PERIOD
        return record.updated_at < gracePeriodAgo
      })
      .map((id) => {
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
    return Date.now() as EpochMs
  }

  private isLokiAdapter(adapter: any): adapter is LokiJSAdapter {
    return adapter._driver && 'loki' in adapter._driver
  }

  private startCleanupTimer() {
    this.cleanupTimer = setInterval(() => {
      this.runScope.abortable(async () => {
        this.paranoidWrite(undefined, async (writer) => {
          await this.cleanupOldDeletedRecords(writer)
        })
      })
    }, SyncStore.CLEANUP_INTERVAL)
  }

  private stopCleanupTimer() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
  }

  /** Destroy permanently records past their grace period
   * (we need to keep records around after being marked deleted
   * for undo purposes, so we don't discard them in writeEntries
   * (after a server push), but instead every hour or so)
  */
  private async cleanupOldDeletedRecords(writer: WriterInterface) {
    const gracePeriodAgo = Date.now() - SyncStore.DELETED_RECORD_GRACE_PERIOD

    const oldDeletedRecords = await writer.callReader(() => this.queryMaybeDeletedRecords(
      Q.where('_status', 'deleted'),
      Q.where('updated_at', Q.lt(gracePeriodAgo))
    ))

    if (oldDeletedRecords.length > 0) {
      this.telemetry.debug(`[store:${this.model.table}] Cleaning up ${oldDeletedRecords.length} old deleted records`)

      const destroyBuilds = oldDeletedRecords.map(record => record.prepareDestroyPermanently())
      return writer.batch(...destroyBuilds)
    }
  }
}
