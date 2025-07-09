import LocalCache from './local-cache/index.js'

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
 * Custom error class for DataContext related errors
 */
export class DataContextError extends Error {
  constructor(message, options = {}) {
    super(message)
    this.name = 'DataContextError'
    this.dataVersionKey = options.dataVersionKey
  }
}

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
    await tempContext.clearCache()
  } else {
    await tempContext.setLastUpdatedTime()
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
    const keys = await cache.getKeys(DataContext.PREFIX)
    await Promise.all(keys.map(key => cache.removeItem(key)))
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
      let data;
      try {
        data = await this.fetchData()

        if (!data) {
          throw new Error('No data returned')
        }
      } catch (error) {
        await this.setLastUpdatedTime();
        throw new DataContextError('Error fetching data when no stale backup data exists', { dataVersionKey: this.dataVersionKey })
      }

      if (data.version !== 'No Change') {
        this.context = data
        await this.cache.setItem(this.localStorageKey, JSON.stringify(data))
      }
      await this.setLastUpdatedTime()
    }
    this.dataPromise = null
    return this.context.data
  }

  async fetchData() {
    return await this.fetchDataFunction(this.version())
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

  async clearCache() {
    this.clearContext()
    if (this.cache) {
      await this.cache.removeItem(this.localStorageKey)
      await this.cache.removeItem(this.localStorageLastUpdatedKey)
    }
  }

  clearContext() {
    this.context = null
  }

  async setLastUpdatedTime() {
    await this.cache.setItem(this.localStorageLastUpdatedKey, new Date().getTime().toString())
  }

  async update(localUpdateFunction, serverUpdateFunction) {
    await this.ensureLocalContextLoaded()
    if (this.context) {
      await localUpdateFunction(this.context)
      if (this.context) this.context.version++
      let data = JSON.stringify(this.context)
      await this.cache.setItem(this.localStorageKey, data)
      await this.setLastUpdatedTime()
    }
    const updatePromise = serverUpdateFunction()
    updatePromise.then((response) => {
      if (response?.version !== this.version()) {
        return this.clearCache()
      }
    })
    return updatePromise
  }

  version() {
    return this.context?.version ?? -1
  }
}
