import { globalConfig } from './config.js'
import cache from './cacheService.js'

/**
 * Exported functions that are excluded from index generation.
 *
 * @type {string[]}
 */
const excludeFromGeneratedIndex = []

//These constants need to match MWP UserDataVersionKeyEnum enum
export const ContentLikesVersionKey = 0
export const ContentProgressVersionKey = 1

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
        await cache.setItem(this.localStorageKey, JSON.stringify(data))
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
    let localData = await cache.getItem(this.localStorageKey)
    if (localData) {
      this.context = JSON.parse(localData)
    }
  }

  async shouldVerifyServerVersions() {
    let lastUpdated = cache.getItem(this.localStorageLastUpdatedKey)
    if (!lastUpdated) return true
    const verifyServerTime = 10000 //10 s
    return new Date().getTime() - lastUpdated > verifyServerTime
  }

  async clearCache() {
    this.clearContext()
    await cache.removeItem(this.localStorageKey)
    await cache.removeItem(this.localStorageLastUpdatedKey)
  }

  clearContext() {
    this.context = null
  }

  async setLastUpdatedTime() {
    await cache.setItem(this.localStorageLastUpdatedKey, new Date().getTime().toString())
  }

  async update(localUpdateFunction, serverUpdateFunction) {
    await this.ensureLocalContextLoaded()
    if (this.context) {
      await localUpdateFunction(this.context)
      if (this.context) this.context.version++
      let data = JSON.stringify(this.context)
      await cache.setItem(this.localStorageKey, data)
      await this.setLastUpdatedTime()
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
}
