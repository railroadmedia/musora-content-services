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

  return fetchHandler(url, token, baseUrl, method, headers, dataVersion, body)
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
  if (dataVersion) reqHeaders['Data-Version'] = dataVersion
  const options = {
    method,
    headers: reqHeaders,
  }
  if (body) options.body = JSON.stringify(body)
  if (token) options.headers['Authorization'] = `Bearer ${token}`
  if (baseUrl && url.startsWith('/')) url = baseUrl + url
  try {
    const response = await fetch(url, options)
    if (response.ok) {
      const contentType = response.headers.get('content-type')
      if (contentType && contentType.indexOf('application/json') !== -1) {
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
