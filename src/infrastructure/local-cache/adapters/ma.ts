import { ILocalCache } from './index'

export default class MobileAppCache implements ILocalCache {
  private storage: any;

  constructor(storage: any) {
    this.storage = storage;
  }

  async getItem(key: string) {
    return await this.storage.getItem(key);
  }

  async setItem(key: string, value: string) {
    await this.storage.setItem(key, value);
  }

  async removeItem(key: string) {
    await this.storage.removeItem(key)
  }

  async getKeys(startsWith?: string) {
    const allKeys = await this.storage.getAllKeys();
    return allKeys.filter(key => !startsWith || key.startsWith(startsWith));
  }
}
