import SyncStore from '../store'
import SyncContext from '../context'
import BaseModel from '../models/Base'
import { RecordId } from '@nozbe/watermelondb'
import type { Span } from '../telemetry/index'

import { SyncError, SyncExistsDTO, SyncReadDTO, SyncReadDTOTarget, SyncWriteDTO } from '..'
import { SyncPushResponse } from '../fetch'
import { ModelSerialized } from '../serializers'

import { Q } from '@nozbe/watermelondb'
export { Q }

export default class SyncRepository<TModel extends BaseModel> {
  context: SyncContext
  store: SyncStore<TModel>

  constructor(store: SyncStore<TModel>) {
    this.context = store.context
    this.store = store
  }

  protected async readOne(id: RecordId) {
    return this._read(() => this.store.readOne(id))
  }

  protected async readSome(ids: RecordId[]) {
    return this._read(() => this.store.readSome(ids))
  }

  protected async readAll() {
    return this._read(() => this.store.readAll())
  }

  protected async queryOne(...args: Q.Clause[]) {
    return this._read(() => this.store.queryOne(...args))
  }

  protected async queryOneId(...args: Q.Clause[]) {
    return this._read(() => this.store.queryOneId(...args))
  }

  protected async queryAll(...args: Q.Clause[]) {
    return this._read(() => this.store.queryAll(...args))
  }

  protected async queryAllIds(...args: Q.Clause[]) {
    return this._read(() => this.store.queryAllIds(...args))
  }

  protected async fetchOne(id: RecordId) {
    return this._fetch(() => this.store.readOne(id))
  }

  protected async fetchAll() {
    return this._fetch(() => this.store.readAll())
  }

  protected async existOne(id: RecordId) {
    const r = await this.readOne(id)
    return {
      ...r,
      data: r.data !== null
    }
  }

  protected async existSome(ids: RecordId[]) {
    const read = await this.readSome(ids)
    const map = new Map<RecordId, (typeof read.data)[0]>()
    read.data.forEach((record) => map.set(record.id, record))

    const result: SyncExistsDTO<TModel, boolean[]> = {
      ...read,
      data: read.data.map((record) => map.has(record.id)),
    }
    return result
  }

  protected async upsertOne(id: RecordId, builder: (record: TModel) => void) {
    return this.store.telemetry.trace(
      { name: `upsert:${this.store.model.table}`, op: 'upsert' },
      (span) => this._push(() => this.store.upsertOne(id, builder, span), span)
    )
  }

  protected async upsertOneOptimistic(id: RecordId, builder: (record: TModel) => void) {
    return this.store.telemetry.trace(
      { name: `upsert:${this.store.model.table}`, op: 'upsertOptimistic' },
      (span) => this._push(() => this.store.upsertOneOptimistic(id, builder, span), span)
    )
  }

  protected async deleteOne(id: RecordId) {
    return this.store.telemetry.trace(
      { name: `delete:${this.store.model.table}`, op: 'delete' },
      (span) => this._pushId(() => this.store.deleteOne(id, span), span)
    )
  }

  private async _push(createRecord: () => Promise<ModelSerialized<TModel>>, span?: Span) {
    const record = await createRecord()

    let response: SyncPushResponse | null = null
    if (!this.context.durability.getValue()) {
      response = await this.store.pushRecordIdsImpatiently([record.id], span)

      if (!response.ok) {
        throw new SyncError('Failed to push records', { response })
      }
    }

    const ret: SyncWriteDTO<TModel> = {
      data: record,
      status: response ? 'synced' : 'unsynced',
      pushStatus: response ? 'success' : 'pending',
    }
    return ret
  }

  private async _pushId(createId: () => Promise<RecordId>, span?: Span) {
    const id = await createId()

    let response: SyncPushResponse | null = null
    if (!this.context.durability.getValue()) {
      response = await this.store.pushRecordIdsImpatiently([id], span)

      if (!response.ok) {
        throw new SyncError('Failed to push records', { response })
      }
    }

    const ret: SyncWriteDTO<TModel> = {
      data: id,
      status: response ? 'synced' : 'unsynced',
      pushStatus: response ? 'success' : 'pending',
    }
    return ret
  }

  // read from local db, but pull (and throw (!) if it fails) if it's never been synced before
  private async _read<T extends SyncReadDTOTarget<TModel>>(query: () => Promise<T>) {
    const fetchToken = await this.store.getLastFetchToken()
    const everPulled = !!fetchToken
    let pull: Awaited<ReturnType<typeof this.store.pullRecords>> | null = null

    if (!everPulled) {
      pull = await this.store.pullRecords()
      if (!pull.ok) {
        throw new SyncError('Failed to pull records', { pull })
      }
    }

    const data = await query()

    const result: SyncReadDTO<TModel, T> = {
      data,
      status: pull?.ok ? 'fresh' : 'stale',
      pullStatus: pull?.ok ? 'success' : 'failure',
      lastFetchToken: fetchToken,
    }
    return result
  }

  private async _fetch<T extends SyncReadDTOTarget<TModel>>(query: () => Promise<T>) {
    const [response, fetchToken] = await Promise.all([
      this.store.pullRecords(),
      this.store.getLastFetchToken(),
    ])
    const data = await query()

    if (!response.ok) {
      const result: SyncReadDTO<TModel, T> = {
        data,
        status: 'stale',
        pullStatus: 'failure',
        lastFetchToken: fetchToken,
      }
      return result
    }

    const result: SyncReadDTO<TModel, T> = {
      data,
      status: 'fresh',
      pullStatus: 'success',
      lastFetchToken: response.token,
    }
    return result
  }
}
