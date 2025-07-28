import { globalConfig } from '../services/config.js'

export default class LocalCache {
  private config: typeof globalConfig;

  constructor() {
    this.config = globalConfig;
  }

  async getItem(key: string) {
    if (this.config.isMA) {
      return await this.config.localStorage.getItem(key);
    } else {
      return this.config.localStorage.getItem(key);
    }
  }

  async setItem(key: string, value: string) {
    if (this.config.isMA) {
      await this.config.localStorage.setItem(key, value);
    } else {
      this.config.localStorage.setItem(key, value);
    }
  }

  async removeItem(key: string) {
    if (this.config.isMA) {
      await this.config.localStorage.removeItem(key);
    } else {
      this.config.localStorage.removeItem(key);
    }
  }

  async getKeys(startsWith?: string) {
    if (this.config.isMA) {
      const allKeys = await this.config.localStorage.getAllKeys();
      return allKeys.filter(key => !startsWith || key.startsWith(startsWith));
    } else {
      const keys: string[] = [];
      for (let i = 0; i < this.config.localStorage.length; i++) {
        const key = this.config.localStorage.key(i);
        if (key && (!startsWith || key.startsWith(startsWith))) {
          keys.push(key);
        }
      }
      return keys;
    }
  }
}
