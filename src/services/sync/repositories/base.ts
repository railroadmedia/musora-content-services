import SyncStore from '../store'
import { Model, Q } from '@nozbe/watermelondb'

import { SyncReadDTO, SyncWriteDTO } from '..'

export default class SyncRepository<TModel extends Model> {
  constructor(protected store: SyncStore<TModel>) {}

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
        const data = await this.store.readOne(result.entry.record.id)

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

  protected async upsert(id: string, builder: (record: TModel) => void) {
    await this.store.db.write(async () => {
      const existing = await this.store.collection
        .query(Q.where('id', id))
        .fetch()
        .then((records) => records[0])

      if (existing) {
        existing.update(builder)
      } else {
        this.store.collection.create((record) => {
          record._raw.id = id
          builder(record)
        })
      }
    })

    return this.store.readRecord(id)
  }
}
