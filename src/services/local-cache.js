import { globalConfig } from './config.js'

export default class LocalCache {
  constructor() {
    this.storage = globalConfig.localStorage;
    this.isMA = globalConfig.isMA;
  }

  async getItem(key) {
    return this.storage.getItem(key);
  }

  async setItem(key, value) {
    return this.storage.setItem(key, value);
  }

  async removeItem(key) {
    return this.storage.removeItem(key);
  }

  async getKeys(startsWith) {
    if (this.isMA) {
      const allKeys = await this.storage.getAllKeys();
      return allKeys.filter(key => !startsWith || key.startsWith(startsWith));
    }

    const keys = [];
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key && (!startsWith || key.startsWith(startsWith))) {
        keys.push(key);
      }
    }
    return keys;
  }
}
