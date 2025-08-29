export interface ConnectivityProvider {
  isOffline(): boolean
  onChange(callback: (isOffline: boolean) => void): () => void
}

export default class SyncConnectivity {
  constructor(private provider: ConnectivityProvider) {}

  get isOffline() {
    return this.provider.isOffline()
  }

  subscribe(callback: (isOffline: boolean) => void) {
    return this.provider.onChange(callback)
  }
}
