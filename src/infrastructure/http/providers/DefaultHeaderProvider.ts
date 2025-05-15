import { HeaderProvider } from '../interfaces/HeaderProvider'
import { globalConfig } from '../../../services/config.js'

export class DefaultHeaderProvider implements HeaderProvider {
  getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }

    // Handle timezone
    if (globalConfig.localTimezoneString) {
      headers['M-Client-Timezone'] = globalConfig.localTimezoneString
    }

    return headers
  }
}
