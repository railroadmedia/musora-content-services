import MobileAppCache from './ma';
import WebCache from './web';

export interface ILocalCache {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getKeys(startsWith?: string): Promise<string[]>;
}

export { MobileAppCache, WebCache };
