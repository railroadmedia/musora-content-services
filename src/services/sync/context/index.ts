import type { BaseConnectivityProvider, BaseVisibilityProvider, BaseTabsProvider, BaseDurabilityProvider } from './providers'

export default class SyncContext {
  connectivity: BaseConnectivityProvider
  visibility: BaseVisibilityProvider
  tabs: BaseTabsProvider
  durability: BaseDurabilityProvider

  constructor(providers: {
    connectivity: BaseConnectivityProvider,
    visibility: BaseVisibilityProvider,
    tabs: BaseTabsProvider,
    durability: BaseDurabilityProvider
  }) {
    this.connectivity = providers.connectivity
    this.visibility = providers.visibility
    this.tabs = providers.tabs
    this.durability = providers.durability
  }

  setup() {
    const teardowns = [
      this.connectivity.setup(),
      this.visibility.setup(),
      this.tabs.setup(),
      this.durability.setup(),
    ]

    return () => teardowns.forEach(teardown => teardown())
  }
}
