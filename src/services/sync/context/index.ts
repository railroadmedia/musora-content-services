import type { BaseConnectivityProvider, BaseVisibilityProvider } from './providers'

export default class SyncContext {
  connectivityProvider: BaseConnectivityProvider
  visibilityProvider: BaseVisibilityProvider

  constructor(providers: {
    connectivity: BaseConnectivityProvider,
    visibility: BaseVisibilityProvider
  }) {
    this.connectivityProvider = providers.connectivity
    this.visibilityProvider = providers.visibility
  }
}
