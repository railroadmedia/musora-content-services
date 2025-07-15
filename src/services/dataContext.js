import { globalConfig } from './config.js'

/**
 * Exported functions that are excluded from index generation.
 *
 * @type {string[]}
 */
const excludeFromGeneratedIndex = []

//These constants need to match MWP UserDataVersionKeyEnum enum
export const ContentLikesVersionKey = 0
export const ContentProgressVersionKey = 1
export const UserActivityVersionKey = 2
export const PollingStateVersionKey = 3

let cache = null

/**
 * Verify current cached data is on the correct version
 *
 * @param {int} dataVersionKey - Data version key from the back end
 * @param {int} currentVersion - Current version of the data on the back end
 * */
export async function verifyLocalDataContext(dataVersionKey, currentVersion) {
  const tempContext = new DataContext(dataVersionKey, null)
  await tempContext.ensureLocalContextLoaded()

  if (currentVersion !== tempContext.version()) {
    tempContext.clearCache()
  } else {
    tempContext.setLastUpdatedTime()
  }
}

export class DataContext {
  context = null
  dataPromise = null

  constructor(dataVersionKey, fetchDataFunction) {
    this.dataVersionKey = dataVersionKey
    this.fetchDataFunction = fetchDataFunction
    this.localStorageKey = `dataContext_${this.dataVersionKey.toString()}`
    this.localStorageLastUpdatedKey = `dataContext_${this.dataVersionKey.toString()}_lastUpdated`
  }

  async getData() {
    if (!this.dataPromise) {
      this.dataPromise = this.getDataPromise()
    }
    return this.dataPromise
  }

  async getDataPromise() {
    await this.ensureLocalContextLoaded()
    const shouldVerify = await this.shouldVerifyServerVersions()

    if (!this.context || shouldVerify) {
      let version = this.version()
      let data = await this.fetchData(version)
      if (data?.version !== 'No Change') {
        this.context = data
        cache.setItem(this.localStorageKey, JSON.stringify(data))
      }
      this.setLastUpdatedTime()
    }
    this.dataPromise = null
    return this.context.data
  }

  async fetchData(version) {
    return await this.fetchDataFunction(version)
  }

  async ensureLocalContextLoaded() {
    if (this.context) return
    this.verifyConfig()
    let localData = globalConfig.isMA
      ? await cache.getItem(this.localStorageKey)
      : cache.getItem(this.localStorageKey)
    if (localData) {
      this.context = JSON.parse(localData)
    }
  }

  verifyConfig() {
    if (!cache) {
      cache = globalConfig.localStorage
      if (!cache)
        throw new Error(
          'dataContext: LocalStorage cache not configured in musora content services initializeService.'
        )
    }
  }

  async shouldVerifyServerVersions() {
    let lastUpdated = globalConfig.isMA
      ? await cache.getItem(this.localStorageLastUpdatedKey)
      : cache.getItem(this.localStorageLastUpdatedKey)
    if (!lastUpdated) return true
    const verifyServerTime = 10000 //10 s
    return new Date().getTime() - lastUpdated > verifyServerTime
  }

  clearCache() {
    this.clearContext()
    if (cache) {
      cache.removeItem(this.localStorageKey)
      cache.removeItem(this.localStorageLastUpdatedKey)
    }
  }

  clearContext() {
    this.context = null
  }

  setLastUpdatedTime() {
    cache.setItem(this.localStorageLastUpdatedKey, new Date().getTime().toString())
  }

  async update(localUpdateFunction, serverUpdateFunction) {
    await this.ensureLocalContextLoaded()
    if (this.context) {
      await localUpdateFunction(this.context)
      if (this.context) this.context.version++
      let data = JSON.stringify(this.context)
      cache.setItem(this.localStorageKey, data)
      this.setLastUpdatedTime()
    }
    const updatePromise = serverUpdateFunction()
    updatePromise.then((response) => {
      if (response?.version !== this.version()) {
        this.clearCache()
      }
    })
    return updatePromise
  }

  version() {
    return this.context?.version ?? -1
  }
  async updateLocal(localUpdateFunction) {
    await this.ensureLocalContextLoaded()
    if (this.context) {
      const res = await localUpdateFunction(this.context)
      if (this.context) this.context.version++
      let data = JSON.stringify(this.context)
      cache.setItem(this.localStorageKey, data)
      this.setLastUpdatedTime()
    }
  }
}
