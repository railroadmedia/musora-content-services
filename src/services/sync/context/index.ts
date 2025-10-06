import type { BaseConnectivityProvider, BaseVisibilityProvider, BaseTabsProvider } from './providers'

export default class SyncContext {
  connectivity: BaseConnectivityProvider
  visibility: BaseVisibilityProvider
  tabs: BaseTabsProvider

  constructor(providers: {
    connectivity: BaseConnectivityProvider,
    visibility: BaseVisibilityProvider,
    tabs: BaseTabsProvider
  }) {
    this.connectivity = providers.connectivity
    this.visibility = providers.visibility
    this.tabs = providers.tabs
  }
}
