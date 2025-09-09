
import SyncManager from "../manager";
import SyncStore from '../store'
import { Model, Q } from '@nozbe/watermelondb'

import { SyncExistsDTO, SyncReadDTO, SyncWriteDTO } from '..'

export default class SyncRepository<TModel extends Model> {
  protected static getStore<T extends typeof Model>(model: T) {
    return SyncManager.getInstance().getStore(model)
  }

  protected constructor(protected store: SyncStore<TModel>) {}

  protected async existOne(id: string) {
    const read = await this.readOne(id)
    const result: SyncExistsDTO = {
      ...read,
      data: read.data !== null
    }
    return result
  }

  protected async existSome(ids: string[]) {
    const read = await this.readSome(ids)
    const map = new Map<string, typeof read.data[0]>()
    read.data.forEach(record => map.set(record.id, record))

    const result: SyncExistsDTO<true> = {
      ...read,
      data: ids.map(id => map.has(id))
    }
    return result
  }

  protected async readOne(id: string) {
    const [data, fetchToken] = await Promise.all([
      this.store.readOne(id),
      this.store.getLastFetchToken(),
    ])

    const result: SyncReadDTO<TModel> = {
      data,
      status: 'stale',
      pullStatus: null,
      lastFetchToken: fetchToken,
    }
    return result
  }

  protected async readSome(ids: string[]) {
    const [data, fetchToken] = await Promise.all([
      this.store.readSome(ids),
      this.store.getLastFetchToken(),
    ])

    const result: SyncReadDTO<TModel, true> = {
      data,
      status: 'stale',
      pullStatus: null,
      lastFetchToken: fetchToken,
    }
    return result
  }

  protected async readAll() {
    const [data, fetchToken] = await Promise.all([
      this.store.readAll(),
      this.store.getLastFetchToken(),
    ])

    const result: SyncReadDTO<TModel, true> = {
      data,
      status: 'stale',
      pullStatus: null,
      lastFetchToken: fetchToken,
    }
    return result
  }

  // swr pattern
  protected async readButFetchOne(id: string) {
    const [data, fetchToken] = await Promise.all([
      this.store.readOne(id),
      this.store.getLastFetchToken(),
    ])
    this.store.pullRecords()

    const result: SyncReadDTO<TModel> = {
      data,
      status: 'stale',
      pullStatus: null,
      lastFetchToken: fetchToken,
    }
    return result
  }

  // swr pattern
  protected async readButFetchAll() {
    const [data, fetchToken] = await Promise.all([
      this.store.readAll(),
      this.store.getLastFetchToken(),
    ])
    this.store.pullRecords()

    const result: SyncReadDTO<TModel, true> = {
      data,
      status: 'stale',
      pullStatus: 'pending',
      lastFetchToken: fetchToken,
    }
    return result
  }

  protected async fetchOne(id: string) {
    const [response, fetchToken] = await Promise.all([
      this.store.pullRecords(),
      this.store.getLastFetchToken(),
    ])
    const data = await this.store.readOne(id)

    if (!response.success) {
      const result: SyncReadDTO<TModel> = {
        data,
        status: 'stale',
        pullStatus: 'failure',
        lastFetchToken: fetchToken,
      }
      return result
    }

    const result: SyncReadDTO<TModel> = {
      data,
      status: 'fresh',
      pullStatus: 'success',
      lastFetchToken: response.token,
    }
    return result
  }

  protected async fetchAll() {
    const [response, fetchToken] = await Promise.all([
      this.store.pullRecords(),
      this.store.getLastFetchToken(),
    ])
    const data = await this.store.readAll()

    if (!response.success) {
      const result: SyncReadDTO<TModel, true> = {
        data,
        status: 'stale',
        pullStatus: 'failure',
        lastFetchToken: fetchToken,
      }
      return result
    }

    const result: SyncReadDTO<TModel, true> = {
      data,
      status: 'fresh',
      pullStatus: 'success',
      lastFetchToken: response.token,
    }
    return result
  }

  protected async pushOneEagerly(record: TModel) {
    const pushed = await this.store.pushRecords([record])

    if (pushed.acknowledged) {
      const result = pushed.results[0]
      if (result.type === 'success') {
        await this.store.write([result.entry])
        const data = await this.store.readOne(result.entry.record.id)!

        const ret: SyncWriteDTO<TModel> = {
          data,
          state: 'synced',
          pushStatus: 'success'
        }
        return ret
      } else if (result.type === 'failure') {
        const data = record
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
}
