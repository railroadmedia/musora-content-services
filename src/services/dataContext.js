import LocalCache from '../infrastructure/local-cache'

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

export async function clearAllDataContexts() {
  return await DataContext.clearAll()
}

export class DataContext {
  static PREFIX = 'dataContext_'

  context = null
  dataPromise = null

  /**
   * Static method to clear all DataContext instances from localStorage
   */
  static async clearAll() {
    const cache = new LocalCache()
    cache.getKeys(this.PREFIX).then(keys => {
      keys.forEach(key => cache.removeItem(key))
    })
  }

  constructor(dataVersionKey, fetchDataFunction) {
    this.dataVersionKey = dataVersionKey
    this.fetchDataFunction = fetchDataFunction
    this.localStorageKey = `${this.constructor.PREFIX}${this.dataVersionKey.toString()}`
    this.localStorageLastUpdatedKey = `${this.constructor.PREFIX}${this.dataVersionKey.toString()}_lastUpdated`
    this.cache = new LocalCache()
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
        this.cache.setItem(this.localStorageKey, JSON.stringify(data))
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
    let localData = await this.cache.getItem(this.localStorageKey)
    if (localData) {
      this.context = JSON.parse(localData)
    }
  }

  async shouldVerifyServerVersions() {
    let lastUpdated = await this.cache.getItem(this.localStorageLastUpdatedKey)
    if (!lastUpdated) return true
    const verifyServerTime = 10000 //10 s
    return new Date().getTime() - lastUpdated > verifyServerTime
  }

  clearCache() {
    this.clearContext()
    if (cache) {
      this.cache.removeItem(this.localStorageKey)
      this.cache.removeItem(this.localStorageLastUpdatedKey)
    }
  }

  clearContext() {
    this.context = null
  }

  setLastUpdatedTime() {
    this.cache.setItem(this.localStorageLastUpdatedKey, new Date().getTime().toString())
  }

  async update(localUpdateFunction, serverUpdateFunction) {
    await this.ensureLocalContextLoaded()
    if (this.context) {
      await localUpdateFunction(this.context)
      if (this.context) this.context.version++
      let data = JSON.stringify(this.context)
      this.cache.setItem(this.localStorageKey, data)
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
      this.cache.setItem(this.localStorageKey, data)
      this.setLastUpdatedTime()
    }
  }
}
