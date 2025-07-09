export default class WebCache {
  constructor(storage) {
    this.storage = storage;
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
