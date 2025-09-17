import type {
  BaseConnectivityProvider,
  BaseVisibilityProvider,
  BaseTabsProvider,
  BaseDurabilityProvider,
} from './providers'

type Providers = {
  connectivity: BaseConnectivityProvider
  visibility: BaseVisibilityProvider
  tabs: BaseTabsProvider
  durability: BaseDurabilityProvider
}

export default class SyncContext {
  constructor(private providers: Providers) {}

  start() {
    Object.values(this.providers).forEach((p) => p.start())
  }

  stop() {
    Object.values(this.providers).forEach((p) => p.stop())
  }

  get connectivity() {
    return this.providers.connectivity
  }
  get visibility() {
    return this.providers.visibility
  }
  get tabs() {
    return this.providers.tabs
  }
  get durability() {
    return this.providers.durability
  }
}
