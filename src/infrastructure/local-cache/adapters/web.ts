import { ILocalCache } from './index'

export default class WebCache implements ILocalCache {
  private storage: Storage;

  constructor(storage: Storage) {
    this.storage = storage;
  }

  async getItem(key: string) {
    return this.storage.getItem(key);
  }

  async setItem(key: string, value: string) {
    this.storage.setItem(key, value);
  }

  async removeItem(key: string) {
    this.storage.removeItem(key);
  }

  async getKeys(startsWith?: string): Promise<string[]> {
    const keys: string[] = [];
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key && (!startsWith || key.startsWith(startsWith))) {
        keys.push(key);
      }
    }
    return keys;
  }
}
