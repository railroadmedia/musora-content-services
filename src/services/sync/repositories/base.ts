
import SyncManager from "../manager";
import SyncStore from '../store'
import SyncContext from '../context'
import BaseModel from '../models/Base'
import { RecordId } from '@nozbe/watermelondb'

import { SyncError, SyncExistsDTO, SyncReadDTO, SyncWriteDTO } from '..'
import { SyncPushResponse } from "../fetch";
import { ModelSerialized } from "../serializers";

export default class SyncRepository<TModel extends BaseModel> {
  context: SyncContext

  protected static getStore<T extends typeof BaseModel>(model: T) {
    return SyncManager.getInstance().getStore(model)
  }

  protected constructor(protected store: SyncStore<TModel>) {
    this.context = SyncManager.getInstance().getContext()
  }

  protected async readOne(id: RecordId) {
    return this._read(() => this.store.readOne(id))
  }

  protected async readSome(ids: RecordId[]) {
    return this._read<true>(() => this.store.readSome(ids))
  }

  protected async readAll() {
    return this._read<true>(() => this.store.readAll())
  }

  protected async existOne(id: RecordId) {
    return this._existOne(() => this.readOne(id))
  }

  protected async existSome(ids: RecordId[]) {
    return this._existSome(() => this.readSome(ids))
  }

  protected async readOneUnsynced(id: RecordId) {
    return this._readUnsynced(() => this.store.readOne(id))
  }

  protected async readSomeUnsynced(ids: RecordId[]) {
    return this._readUnsynced<true>(() => this.store.readSome(ids))
  }

  protected async readAllUnsynced() {
    return this._readUnsynced<true>(() => this.store.readAll())
  }

  protected async existOneUnsynced(id: RecordId) {
    return this._existOne(() => this.readOneUnsynced(id))
  }

  protected async existSomeUnsynced(ids: RecordId[]) {
    return this._existSome(() => this.readSomeUnsynced(ids))
  }

  protected async fetchOne(id: RecordId) {
    return this._fetch(() => this.store.readOne(id))
  }

  protected async fetchAll() {
    return this._fetch<true>(() => this.store.readAll())
  }

  protected async upsertOne(id: RecordId, builder: (record: TModel) => void) {
    return this._push(await this.store.upsertOne(id, builder))
  }

  protected async deleteOne(id: RecordId) {
    return this._pushId(await this.store.deleteOne(id))
  }

  private async _push(record: ModelSerialized<TModel>) {
    let response: SyncPushResponse | null = null
    if (!this.context.durability.getValue()) {
      response = await this.store.pushRecordIdsImpatiently([record.id])

      if (!response.ok) {
        throw new SyncError('Failed to push records', { response })
      }
    }

    const ret: SyncWriteDTO<TModel> = {
      data: record,
      status: response ? 'synced' : 'unsynced',
      pushStatus: response ? 'success' : 'pending'
    }
    return ret
  }

  private async _pushId(id: RecordId) {
    let response: SyncPushResponse | null = null
    if (!this.context.durability.getValue()) {
      response = await this.store.pushRecordIdsImpatiently([id])

      if (!response.ok) {
        throw new SyncError('Failed to push records', { response })
      }
    }

    const ret: SyncWriteDTO<TModel> = {
      data: id,
      status: response ? 'synced' : 'unsynced',
      pushStatus: response ? 'success' : 'pending'
    }
    return ret
  }

  // read from local db, but pull (and throw (!) if it fails) if it's never been synced before

  private async _read<TMultiple extends boolean = false>(query: () => Promise<SyncReadDTO<TModel, TMultiple>['data']>) {
    const fetchToken = await this.store.getLastFetchToken();
    const everPulled = !!fetchToken;
    let pull: Awaited<ReturnType<typeof this.store.pullRecordsImpatiently>> | null = null;

    if (!everPulled) {
      pull = await this.store.pullRecordsImpatiently()
      if (!pull.ok) {
        throw new SyncError('Failed to pull records', { pull })
      }
    }

    const data = await query()

    const result: SyncReadDTO<TModel, TMultiple> = {
      data,
      status: pull?.ok ? 'fresh' : 'stale',
      pullStatus: pull?.ok ? 'success' : 'failure',
      lastFetchToken: fetchToken,
    }
    return result
  }

  private async _readUnsynced<TMultiple extends boolean = false>(query: () => Promise<SyncReadDTO<TModel, TMultiple>['data']>) {
    const [data, fetchToken] = await Promise.all([
      query(),
      this.store.getLastFetchToken(),
    ])

    const result: SyncReadDTO<TModel, TMultiple> = {
      data,
      status: 'stale',
      pullStatus: null,
      lastFetchToken: fetchToken,
    }
    return result
  }

  private async _existOne(query: () => Promise<SyncReadDTO<TModel>>) {
    const read = await query()
    const result: SyncExistsDTO = {
      ...read,
      data: read.data !== null
    }
    return result
  }

  private async _existSome(query: () => Promise<SyncReadDTO<TModel, true>>) {
    const read = await query()
    const map = new Map<RecordId, typeof read.data[0]>()
    read.data.forEach(record => map.set(record.id, record))

    const result: SyncExistsDTO<true> = {
      ...read,
      data: read.data.map(record => map.has(record.id))
    }
    return result
  }

  private async _fetch<TMultiple extends boolean = false>(query: () => Promise<SyncReadDTO<TModel, TMultiple>['data']>) {
    const [response, fetchToken] = await Promise.all([
      this.store.pullRecords(),
      this.store.getLastFetchToken(),
    ])
    const data = await query()

    if (!response.ok) {
      const result: SyncReadDTO<TModel, TMultiple> = {
        data,
        status: 'stale',
        pullStatus: 'failure',
        lastFetchToken: fetchToken,
      }
      return result
    }

    const result: SyncReadDTO<TModel, TMultiple> = {
      data,
      status: 'fresh',
      pullStatus: 'success',
      lastFetchToken: response.token,
    }
    return result
  }
}
