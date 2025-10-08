import BaseContextProvider from "./base";

export default abstract class BaseTabsProvider extends BaseContextProvider {
  abstract hasOtherTabs(): boolean
  abstract broadcast<T>(name: string, payload: T): void
  abstract subscribe<T>(name: string, callback: (payload: T) => void): () => void
}

export class NullTabsProvider extends BaseTabsProvider {
  hasOtherTabs() {
    return false
  }

  broadcast() {}
  subscribe() {
    return () => {}
  }
}
