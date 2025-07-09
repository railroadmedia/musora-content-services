export default class MobileAppCache {
  constructor(storage) {
    this.storage = storage;
  }

  async getItem(key) {
    return this.storage.getItem(key);
  }

  async setItem(key, value) {
    this.storage.setItem(key, value);
  }

  async removeItem(key) {
    this.storage.removeItem(key);
  }

  async getKeys(startsWith) {
    const allKeys = await this.storage.getAllKeys();
    return allKeys.filter(key => !startsWith || key.startsWith(startsWith));
  }
}
