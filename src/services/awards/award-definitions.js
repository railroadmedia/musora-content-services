/** @typedef {Map<string, import('./types').AwardDefinition>} AwardDefinitionsMap */
/** @typedef {Map<number, string[]>} ContentToAwardsMap */

const STORAGE_KEY = 'musora_award_definitions_last_fetch'

class AwardDefinitionsService {
  constructor() {
    /** @type {AwardDefinitionsMap} */
    this.definitions = new Map()

    /** @type {ContentToAwardsMap} */
    this.contentIndex = new Map()

    /** @type {number} */
    this.lastFetch = 0

    /** @type {number} */
    this.cacheDuration = 24 * 60 * 60 * 1000

    /** @type {boolean} */
    this.isFetching = false

    /** @type {boolean} */
    this.initialized = false
  }

  /** @returns {Promise<import('./types').AwardDefinition[]>} */
  async getAll(forceRefresh = false) {
    if (this.shouldRefresh() || forceRefresh) {
      await this.fetchFromSanity()
    }
    return Array.from(this.definitions.values())
  }

  /** @returns {Promise<import('./types').AwardDefinition | null>} */
  async getById(awardId) {
    if (this.shouldRefresh()) {
      await this.fetchFromSanity()
    }
    return this.definitions.get(awardId) || null
  }

  /** @returns {Promise<import('./types').AwardDefinition[]>} */
  async getByContentId(contentId) {
    if (this.shouldRefresh()) {
      await this.fetchFromSanity()
    }

    const awardIds = this.contentIndex.get(contentId) || []
    return awardIds
      .map(id => this.definitions.get(id))
      .filter(Boolean)
  }

  /** @returns {Promise<boolean>} */
  async hasAwards(contentId) {
    if (this.shouldRefresh()) {
      await this.fetchFromSanity()
    }
    return (this.contentIndex.get(contentId)?.length ?? 0) > 0
  }

  /** @returns {Promise<void>} */
  async fetchFromSanity() {
    if (this.isFetching) {
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (!this.isFetching) {
            clearInterval(checkInterval)
            resolve()
          }
        }, 100)
      })
    }

    this.isFetching = true

    try {
      const { fetchSanity } = await import('../sanity')

      const query = `*[_type == 'content-award'] {
        _id,
        is_active,
        name,
        'logo': logo.asset->url,
        'badge': badge.asset->url,
        'award': award.asset->url,
        'content_id': content->railcontent_id,
        'content_type': content->_type,
        'type': _type,
        brand,
        'content_title': content->title,
        award_custom_text,
        'instructor_signature': content->instructor[0]->signature.asset->url,
        'instructor_name': content->instructor[0]->name,
        'child_ids': content->child[status != 'draft']->railcontent_id,
      }`

      const awards = await fetchSanity(query, true, { processNeedAccess: false })

      this.definitions.clear()
      this.contentIndex.clear()

      awards.forEach(award => {
        award.has_kickoff = award.content_type === 'guided-course'

        this.definitions.set(award._id, award)

        if (award.content_id) {
          const existing = this.contentIndex.get(award.content_id) || []
          this.contentIndex.set(award.content_id, [...existing, award._id])
        }
      })

      this.lastFetch = Date.now()
      await this.saveLastFetchToStorage()
    } catch (error) {
      console.error('Failed to fetch award definitions from Sanity:', error)
    } finally {
      this.isFetching = false
    }
  }

  /** @returns {boolean} */
  shouldRefresh() {
    return this.definitions.size === 0 ||
           (Date.now() - this.lastFetch) > this.cacheDuration
  }

  /** @returns {Promise<void>} */
  async refresh() {
    await this.fetchFromSanity()
  }

  async loadLastFetchFromStorage() {
    try {
      const { globalConfig } = await import('../config')
      if (!globalConfig.localStorage) {
        return
      }

      const stored = globalConfig.isMA
        ? await globalConfig.localStorage.getItem(STORAGE_KEY)
        : globalConfig.localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const timestamp = parseInt(stored, 10)
        if (!isNaN(timestamp)) {
          this.lastFetch = timestamp
        }
      }
    } catch (error) {
      console.error('Failed to load lastFetch from storage:', error)
    }
  }

  async saveLastFetchToStorage() {
    try {
      const { globalConfig } = await import('../config')
      if (!globalConfig.localStorage) {
        return
      }

      if (globalConfig.isMA) {
        await globalConfig.localStorage.setItem(STORAGE_KEY, this.lastFetch.toString())
      } else {
        globalConfig.localStorage.setItem(STORAGE_KEY, this.lastFetch.toString())
      }
    } catch (error) {
      console.error('Failed to save lastFetch to storage:', error)
    }
  }

  async initialize() {
    if (this.initialized) {
      return
    }

    await this.loadLastFetchFromStorage()

    if (this.shouldRefresh()) {
      await this.fetchFromSanity()
    }

    this.initialized = true
  }

  clear() {
    this.definitions.clear()
    this.contentIndex.clear()
    this.lastFetch = 0
    this.initialized = false
  }

  getCacheStats() {
    return {
      totalDefinitions: this.definitions.size,
      totalContentMappings: this.contentIndex.size,
      lastFetch: this.lastFetch ? new Date(this.lastFetch).toISOString() : null,
      cacheAge: this.lastFetch ? Date.now() - this.lastFetch : null,
      isFetching: this.isFetching,
      initialized: this.initialized,
      cacheDuration: this.cacheDuration
    }
  }
}

export const awardDefinitions = new AwardDefinitionsService()

export async function initializeAwardDefinitions() {
  await awardDefinitions.initialize()
}
