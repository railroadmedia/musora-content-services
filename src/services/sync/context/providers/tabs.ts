import BaseContextProvider from "./base";

export default abstract class BaseTabsProvider extends BaseContextProvider {
  abstract hasOtherTabs(): boolean
  abstract broadcast<T>(payload: T): void
  abstract subscribe<T>(callback: (payload: T) => void): () => void
}

export class NullTabsProvider extends BaseTabsProvider {
  hasOtherTabs() {
    return false
  }

  start() {}
  stop() {}

  broadcast() {}
  subscribe() {
    return () => {}
  }
}
