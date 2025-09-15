
import SyncManager from "../manager";
import SyncStore from '../store'
import BaseModel from '../models/Base'
import { RecordId } from '@nozbe/watermelondb'

import { SyncExistsDTO, SyncReadDTO, SyncWriteDTO } from '..'

export default class SyncRepository<TModel extends BaseModel> {
  protected static getStore<T extends typeof BaseModel>(model: T) {
    return SyncManager.getInstance().getStore(model)
  }

  protected constructor(protected store: SyncStore<TModel>) {}

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

  protected async pushOneEagerlyById(id: RecordId) {
    const pushed = await this.store.pushId(id)
    if (pushed.acknowledged) {
      const result = pushed.results[0]
      if (result.type === 'success') {
        await this.store.write([result.entry])
        const data = (await this.store.readOne(result.entry.meta.ids.id))! // todo - server could still have deleted this record

        const ret: SyncWriteDTO<TModel> = {
          data,
          state: 'synced',
          pushStatus: 'success'
        }
        return ret
      } else if (result.type === 'failure') {
        const data = null // TODO - get back from server
        const ret: SyncWriteDTO<TModel> = {
          data,
          state: 'unsynced',
          pushStatus: 'failure'
        }
        return ret
      }
    } else {
      throw new Error('SyncStore.pushOneImmediate: failed to push record') // todo - proper error
    }
  }

  // read from local db, but pull (and potentially throw (!)) if it's never been synced before

  private async _read<TMultiple extends boolean = false>(query: () => Promise<SyncReadDTO<TModel, TMultiple>['data']>) {
    const fetchToken = await this.store.getLastFetchToken();
    const synced = !!fetchToken;
    let pull: Awaited<ReturnType<typeof this.store.pullRecords>> | null = null;

    if (!synced) {
      pull = await this.store.pullRecords()
    }

    const data = await query()

    const result: SyncReadDTO<TModel, TMultiple> = {
      data,
      status: pull?.success ? 'fresh' : 'stale',
      pullStatus: null,
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

    if (!response.success) {
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
