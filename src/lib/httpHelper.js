import { globalConfig } from '../services/config.js'

export async function fetchJSONHandler(
  url,
  token,
  baseUrl,
  method = 'get',
  dataVersion = null,
  body = null
) {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-CSRF-TOKEN': token,
  }

  if (body) {
    body = JSON.stringify(body)
  }

  try {
    const response = await fetchHandler(url, token, baseUrl, method, headers, dataVersion, body)

    if (response.ok) {
      const contentType = response.headers.get('content-type')
      if (
        contentType &&
        contentType.indexOf('application/json') !== -1 &&
        response.status !== 204
      ) {
        return await response.json()
      } else {
        return await response.text()
      }
    } else {
      console.error(`Fetch error: ${method} ${url} ${response.status} ${response.statusText}`)
      console.log(response)
    }
  } catch (error) {
    console.error('Fetch error:', error)
  }
  return null
}

export async function fetchHandler(
  url,
  token,
  baseUrl,
  method = 'get',
  headers = {},
  dataVersion = null,
  body = null
) {
  let reqHeaders = {
    ...headers,
    Accept: 'application/json',
    'X-CSRF-TOKEN': token,
  }

  if (!globalConfig.isMA) {
    const params = new URLSearchParams(window.location.search)
    if (params.get('testNow')) {
      reqHeaders['testNow'] = params.get('testNow')
    }
    if (params.get('timezone')) {
      reqHeaders['M-Client-Timezone'] = params.get('timezone')
    }
  }

  if (globalConfig.localTimezoneString)
    reqHeaders['M-Client-Timezone'] = globalConfig.localTimezoneString
  if (dataVersion) {
    if (typeof dataVersion === 'number' || typeof dataVersion === 'string') {
      reqHeaders['Data-Version'] = dataVersion
    } else if (typeof dataVersion === 'object' && (dataVersion.version || dataVersion.schemaVersion)) {
      reqHeaders['Data-Version'] = dataVersion.version
      reqHeaders['Schema-Version'] = dataVersion.schemaVersion
    }
  }
  const options = {
    method,
    headers: reqHeaders,
  }
  if (body) options.body = body
  if (token) options.headers['Authorization'] = `Bearer ${token}`
  if (baseUrl && url.startsWith('/')) url = baseUrl + url
  try {
    return fetch(url, options)
  } catch (error) {
    console.error('Fetch error:', error)
  }
  return null
}
