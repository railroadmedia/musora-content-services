import SyncStore from '../store'
import SyncContext from '../context'
import BaseModel from '../models/Base'
import { RecordId } from '@nozbe/watermelondb'
import type { Span } from '../telemetry/index'

import { SyncError, SyncExistsDTO, SyncReadDTO, SyncReadData, SyncWriteDTO, SyncWriteIdData, SyncWriteRecordData, SyncRemoteWriteDTO} from '..'
import { SyncPushResponse } from '../fetch'

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
    return this._respondToRead(() => this.store.readOne(id))
  }

  protected async readSome(ids: RecordId[]) {
    return this._respondToRead(() => this.store.readSome(ids))
  }

  protected async readAll() {
    return this._respondToRead(() => this.store.readAll())
  }

  protected async queryOne(...args: Q.Clause[]) {
    return this._respondToRead(() => this.store.queryOne(...args))
  }

  protected async queryOneId(...args: Q.Clause[]) {
    return this._respondToRead(() => this.store.queryOneId(...args))
  }

  protected async queryAll(...args: Q.Clause[]) {
    return this._respondToRead(() => this.store.queryAll(...args))
  }

  protected async queryAllIds(...args: Q.Clause[]) {
    return this._respondToRead(() => this.store.queryAllIds(...args))
  }

  protected async queryAllDeletedIds(...args: Q.Clause[]) {
    return this._respondToRead(() => this.store.queryAllDeletedIds(...args))
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
      data: ids.map((id) => map.has(id)),
    }
    return result
  }

  protected async insertOne(builder: (record: TModel) => void) {
    return this.store.telemetry.trace(
      { name: `insertOne:${this.store.model.table}`, op: 'insert', attributes: { ...this.context.session.toJSON() } },
      (span) => this._respondToWrite(() => this.store.insertOne(builder, span), span)
    )
  }

  protected async updateOneId(id: RecordId, builder: (record: TModel) => void) {
    return this.store.telemetry.trace(
      { name: `updateOne:${this.store.model.table}`, op: 'update', attributes: { ...this.context.session.toJSON() } },
      (span) => this._respondToWrite(() => this.store.updateOneId(id, builder, span), span)
    )
  }

  protected async upsertOne(id: RecordId, builder: (record: TModel) => void, { skipPush = false } = {}) {
    return this.store.telemetry.trace(
      { name: `upsertOne:${this.store.model.table}`, op: 'upsert', attributes: { ...this.context.session.toJSON() } },
      (span) => this._respondToWrite(() => this.store.upsertOne(id, builder, span, {skipPush}), span)
    )
  }

  protected async upsertOneTentative(id: RecordId, builder: (record: TModel) => void) {
    return this.store.telemetry.trace(
      { name: `upsertOneTentative:${this.store.model.table}`, op: 'upsert', attributes: { ...this.context.session.toJSON() } },
      (span) => this._respondToWrite(() => this.store.upsertOneTentative(id, builder, span), span)
    )
  }

  protected async upsertSome(builders: Record<RecordId, (record: TModel) => void>, { skipPush = false } = {}) {
    return this.store.telemetry.trace(
      { name: `upsertSome:${this.store.model.table}`, op: 'upsert', attributes: { ...this.context.session.toJSON() } },
      (span) => this._respondToWrite(() => this.store.upsertSome(builders, span, {skipPush}), span)
    )
  }

  protected async upsertSomeTentative(builders: Record<RecordId, (record: TModel) => void>, { skipPush = false } = {}) {
    return this.store.telemetry.trace(
      { name: `upsertSomeTentative:${this.store.model.table}`, op: 'upsert', attributes: { ...this.context.session.toJSON() } },
      (span) => this._respondToWrite(() => this.store.upsertSomeTentative(builders, span, {skipPush}), span)
    )
  }

  protected async deleteOne(id: RecordId, { skipPush = false } = {}) {
    return this.store.telemetry.trace(
      { name: `delete:${this.store.model.table}`, op: 'delete', attributes: { ...this.context.session.toJSON() } },
      (span) => this._respondToWriteIds(() => this.store.deleteOne(id, span, {skipPush}), span)
    )
  }

  protected async deleteSome(ids: RecordId[]) {
    return this.store.telemetry.trace(
      { name: `deleteSome:${this.store.model.table}`, op: 'delete', attributes: { ...this.context.session.toJSON() } },
      (span) => this._respondToWriteIds(() => this.store.deleteSome(ids, span), span)
    )
  }

  protected async restoreOne(id: RecordId) {
    return this.store.telemetry.trace(
      { name: `restoreOne:${this.store.model.table}`, op: 'restore', attributes: { ...this.context.session.toJSON() } },
      (span) => this._respondToWrite(() => this.store.restoreOne(id, span), span)
    )
  }

  protected async restoreSome(ids: RecordId[]) {
    return this.store.telemetry.trace(
      { name: `restoreSome:${this.store.model.table}`, op: 'restore', attributes: { ...this.context.session.toJSON() } },
      (span) => this._respondToWrite(() => this.store.restoreSome(ids, span), span)
    )
  }

  private async _respondToWrite<T extends SyncWriteRecordData<TModel>>(create: () => Promise<T>, span?: Span) {
    const data = await create()

    let response: SyncPushResponse | null = null
    if (!this.context.durability.getValue()) {
      response = await this.store.pushRecordIdsImpatiently('id' in data ? [data.id] : data.map(r => r.id), span)

      if (!response.ok) {
        throw new SyncError('Failed to push records', { response })
      }
    }

    const ret: SyncWriteDTO<TModel, T> = {
      data,
      status: response ? 'synced' : 'unsynced',
      pushStatus: response ? 'success' : 'pending',
    }
    return ret
  }

  private async _respondToWriteIds<T extends SyncWriteIdData<TModel>>(create: () => Promise<T>, span?: Span) {
    const data = await create()

    let response: SyncPushResponse | null = null
    if (!this.context.durability.getValue()) {
      response = await this.store.pushRecordIdsImpatiently(typeof data === 'string' ? [data] : data, span)

      if (!response.ok) {
        throw new SyncError('Failed to push records', { response })
      }
    }

    const ret: SyncWriteDTO<TModel, T> = {
      data,
      status: response ? 'synced' : 'unsynced',
      pushStatus: response ? 'success' : 'pending',
    }
    return ret
  }

  private async _respondToRemoteWriteOne<T extends SyncPushResponse>(push: () => Promise<T>, id: RecordId, span?: Span) {
    const response = await push()

    if (!response.ok) {
      throw new SyncError('Failed to push records', { response })
    }

    const data = await this.store.readOne(id)

    const ret: SyncRemoteWriteDTO<TModel> = {
      data,
      status: 'synced',
      pushStatus: 'success'
    }
    return ret
  }

  // read from local db, but pull (and throw (!) if it fails) if it's never been synced before
  private async _respondToRead<T extends SyncReadData<TModel>>(query: () => Promise<T>) {
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
      pullStatus: pull ? (pull.ok ? 'success' : 'failure') : null,
      lastFetchToken: fetchToken,
    }
    return result
  }

  private async _fetch<T extends SyncReadData<TModel>>(query: () => Promise<T>) {
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

  requestPushUnsynced() {
    this.store.pushUnsyncedWithRetry()
  }
}
