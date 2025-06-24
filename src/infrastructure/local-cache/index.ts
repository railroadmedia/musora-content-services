import { globalConfig } from '../../services/config.js'

import { ILocalCache, MobileAppCache, WebCache } from './adapters/index.js'

export default class LocalCache implements ILocalCache {
  private config: typeof globalConfig;

  constructor() {
    this.config = globalConfig;
  }

  /**
   * Creates the appropriate cache implementation based on current config
   * This is called lazily when a method is invoked, not at construction time
   */
  private createCacheImplementation(): ILocalCache {
    if (!this.config.localStorage) {
      throw new Error(
        'LocalStorage cache not configured in musora content services initializeService.'
      );
    }

    if (this.config.isMA) {
      return new MobileAppCache(this.config.localStorage);
    } else {
      return new WebCache(this.config.localStorage);
    }
  }

  async getItem(key: string) {
    return this.createCacheImplementation().getItem(key);
  }

  async setItem(key: string, value: string) {
    return this.createCacheImplementation().setItem(key, value);
  }

  async removeItem(key: string) {
    return this.createCacheImplementation().removeItem(key);
  }

  async getKeys(startsWith: string) {
    return this.createCacheImplementation().getKeys(startsWith);
  }
}
