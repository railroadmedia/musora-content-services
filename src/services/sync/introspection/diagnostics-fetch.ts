import { globalConfig } from '../../config.js'

export function diagnosticsFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${globalConfig.baseUrl}/api/sync/v1/diagnostics${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(globalConfig.sessionConfig?.token ? { Authorization: `Bearer ${globalConfig.sessionConfig.token}` } : {}),
      ...init?.headers,
    },
  })
}
