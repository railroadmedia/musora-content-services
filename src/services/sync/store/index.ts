import { Database, Q, type Collection, type Model } from '@nozbe/watermelondb'
import { ServerPullResponse } from '../fetch'
interface SyncStoreResponse<T extends Model = Model> {
  data: T | T[]
  status: 'fresh' | 'possiblyStale'
  previousFetchToken: string | null
  fetchToken: string
}

export type SyncStoreMultiResponse<T extends Model = Model> = SyncStoreResponse<T> & {
  data: T[]
}

export type SyncStoreSingleResponse<T extends Model = Model> = SyncStoreResponse<T> & {
  data: T
}

export default class SyncStore<T extends Model = Model> {
  db: Database
  model: T
  collection: Collection<T>
  lastFetchToken: string | null = null

  pull: (previousFetchToken: string | null) => Promise<ServerPullResponse<T>>
  push: () => Promise<any>

  fetchedOnce: boolean = false

  constructor(model: T, db: Database, { pull, push }: {
    pull: (previousFetchToken: string | null) => Promise<ServerPullResponse<T>>,
    push: () => Promise<any>
  }) {
    this.db = db
    this.model = model
    this.collection = db.collections.get(model.table)
    this.lastFetchToken = `last_fetch_token:${this.model.table}`
    this.pull = pull
    this.push = push
  }

  async getLastFetchToken(): Promise<string | null> {
    return this.db.localStorage.get(this.lastFetchToken) ?? null
  }

  async setLastFetchToken(token: string) {
    return this.db.localStorage.set(this.lastFetchToken, token)
  }

  async sync() {
    return this.fetch(await this.getLastFetchToken())
  }

  async readOne(id: string): Promise<SyncStoreSingleResponse> {
    const [data, fetchToken] = await Promise.all([
      this.readLocalOne(id),
      this.getLastFetchToken()
    ])

    return {
      data,
      status: 'possiblyStale',
      previousFetchToken: fetchToken,
      fetchToken
    }
  }

  async readAll(): Promise<SyncStoreMultiResponse> {
    const [data, fetchToken] = await Promise.all([
      this.readLocalAll(),
      this.getLastFetchToken()
    ])

    return {
      data,
      status: 'possiblyStale',
      previousFetchToken: fetchToken,
      fetchToken
    }
  }

  async fetchAll() {
    const fetchToken = await this.getLastFetchToken()
    const response = await this.fetch(fetchToken)
    this.fetchedOnce = true

    await Promise.all([
      this.writeLocal(response.data),
      this.setLastFetchToken(response.token)
    ])

    return {
      data: response.data, // todo - not actual watermelon data
      status: 'fresh',
      previousFetchToken: null,
      fetchToken: response.token
    }
  }

  async fetchOne(id: string) {
    const fetchToken = await this.getLastFetchToken()
    const response = await this.fetch(fetchToken)
    this.fetchedOnce = true

    await Promise.all([
      this.writeLocal(response.data),
      this.setLastFetchToken(response.token)
    ])

    return {
      data: response.data.find(d => d.id === id), // todo - not actual watermelon data
      status: 'fresh',
      previousFetchToken: null,
      fetchToken: response.token
    }
  }

  async fetchAllOnce() {
    if (!this.fetchedOnce) {
      return this.fetchAll()
    }
    return this.readAll()
  }

  async fetchOneOnce(id: string) {
    if (!this.fetchedOnce) {
      return this.fetchOne(id)
    }
    return this.readOne(id)
  }

  private async fetch(previousFetchToken: string | null) {
    return this.pull(previousFetchToken)
  }

  private async readLocalAll() {
    return this.collection.query().fetch()
  }

  private async readLocalOne(id: string) {
    return this.collection.query(Q.where('id', id)).fetch().then(records => records[0])
  }

  private async writeLocal(data: T[]) {
    return this.db.write(writer => {
      const records = data.map(recordData => this.collection.prepareCreate(record => {
        Object.assign(record, recordData)
      }))
      return writer.batch(...records)
    })
  }
}
