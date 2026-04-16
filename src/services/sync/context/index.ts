import type {
  BaseSessionProvider,
  BaseConnectivityProvider,
  BaseVisibilityProvider,
  BaseTabsProvider,
  BaseDurabilityProvider,
} from './providers'

type Providers = {
  session: BaseSessionProvider
  connectivity: BaseConnectivityProvider
  visibility: BaseVisibilityProvider
  tabs: BaseTabsProvider
  durability: BaseDurabilityProvider
}

export default class SyncContext {
  constructor(private providers: Providers) {}

  /* istanbul ignore next */
  start() {
    Object.values(this.providers).forEach((p) => p.start())
  }

  /* istanbul ignore next */
  stop() {
    Object.values(this.providers).forEach((p) => p.stop())
  }

  /* istanbul ignore next */
  get session() {
    return this.providers.session
  }
  /* istanbul ignore next */
  get connectivity() {
    return this.providers.connectivity
  }
  /* istanbul ignore next */
  get visibility() {
    return this.providers.visibility
  }
  /* istanbul ignore next */
  get tabs() {
    return this.providers.tabs
  }
  /* istanbul ignore next */
  get durability() {
    return this.providers.durability
  }
}
