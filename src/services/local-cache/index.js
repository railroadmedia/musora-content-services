import { globalConfig } from '../../services/config.js'

import { MobileAppCache, WebCache } from './adapters/index.js'

export default class LocalCache {
  /**
   * Creates the appropriate cache implementation based on current config
   * This is called lazily when a method is invoked, not at construction time
   */
  createCacheImplementation() {
    if (!globalConfig.localStorage) {
      throw new Error(
        'LocalStorage cache not configured in musora content services initializeService.'
      );
    }

    if (globalConfig.isMA) {
      return new MobileAppCache(globalConfig.localStorage);
    } else {
      return new WebCache(globalConfig.localStorage);
    }
  }

  async getItem(key) {
    return this.createCacheImplementation().getItem(key);
  }

  async setItem(key, value) {
    return this.createCacheImplementation().setItem(key, value);
  }

  async removeItem(key) {
    return this.createCacheImplementation().removeItem(key);
  }

  async getKeys(startsWith) {
    return this.createCacheImplementation().getKeys(startsWith);
  }
}
