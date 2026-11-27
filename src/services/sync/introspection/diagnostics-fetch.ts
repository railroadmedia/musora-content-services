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

export async function postDiagnostics(path: string, body: unknown): Promise<boolean> {
  try {
    const response = await diagnosticsFetch(path, { method: 'POST', body: JSON.stringify(body) })
    return response.ok
  } catch {
    return false
  }
}
