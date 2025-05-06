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

    // Add CSRF token if present in document
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
    if (csrfToken) {
      headers['X-CSRF-TOKEN'] = csrfToken
    }

    return headers
  }
}
