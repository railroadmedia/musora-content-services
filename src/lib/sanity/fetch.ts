import {  SONG_TYPES_WITH_CHILDREN } from '../../contentTypeConfig.js'
import { globalConfig } from '../../services/config.js'
import { getPermissionsAdapter } from '../../services/permissions'

interface SanityConfig {
  token: string;
  projectId: string;
  dataset: string;
  version: string;
}

interface Config {
  sanityConfig: SanityConfig;
}

export async function fetchSanity(
  query: any,
  isList: any,
  { customPostProcess = null, processNeedAccess = true, processPageType = true }: any = {}
) {
  // Check the config object before proceeding
  if (!checkSanityConfig(globalConfig)) {
    return null
  }
  const perspective = globalConfig.sanityConfig.perspective ?? 'published'
  const api = globalConfig.sanityConfig.useCachedAPI ? 'apicdn' : 'api'
  const baseUrl = `https://${globalConfig.sanityConfig.projectId}.${api}.sanity.io/v${globalConfig.sanityConfig.version}/data/query/${globalConfig.sanityConfig.dataset}?perspective=${perspective}`
  const headers = {
    'Content-Type': 'application/json',
  }
  try {
    const encodedQuery = encodeURIComponent(query)
    const fullGetUrl = `${baseUrl}&query=${encodedQuery}`
    const useGet = fullGetUrl.length < 8000

    let url, method, options
    if (useGet) {
      url = fullGetUrl
      method = 'GET'
      options = {
        method,
        headers,
      }
    } else {
      url = baseUrl
      method = 'POST'
      options = {
        method,
        headers,
        body: JSON.stringify({ query }),
      }
    }
    const adapter = getPermissionsAdapter()
    let promisesResult = await Promise.all([
      fetch(url, options),
      processNeedAccess ? adapter.fetchUserPermissions() : null,
    ])
    const response = promisesResult[0]
    const userPermissions = promisesResult[1]
    if (!response.ok) {
      throw new Error(`Sanity API error: ${response.status} - ${response.statusText}`)
    }
    const result = await response.json()
    if (result.result) {
      let results = isList ? result.result : result.result[0]
      if (!results) {
        throw new Error('No results found')
      }
      results = processNeedAccess ? await needsAccessDecorator(results, userPermissions) : results
      results = processPageType ? pageTypeDecorator(results) : results
      return customPostProcess ? customPostProcess(results) : results
    } else {
      throw new Error('No results found')
    }
  } catch (error) {
    console.error('fetchSanity: Fetch error:', { error, query })
    return null
  }
}

function contentResultsDecorator(results: any, fieldName: any, callback: any) {
  if (Array.isArray(results)) {
    results.forEach((result) => {
      // Check if this is a content row structure
      if (result.content && Array.isArray(result.content)) {
        // Content rows structure: array of rows, each with a content array
        result.content.forEach((contentItem: any) => {
          if (contentItem) {
            contentItem[fieldName] = callback(contentItem)
          }
        })
      } else {
        result[fieldName] = callback(result)
      }
    })
  } else if (results.entity && Array.isArray(results.entity)) {
    // Group By
    results.entity.forEach((result: any) => {
      if (result.lessons) {
        result.lessons.forEach((lesson: any) => {
          lesson[fieldName] = callback(lesson) // Updated to check lesson access
        })
      } else {
        result[fieldName] = callback(result)
      }
    })
  } else if (results.related_lessons && Array.isArray(results.related_lessons)) {
    results.related_lessons.forEach((result: any) => {
      result[fieldName] = callback(result)
    })
  } else if (results.data && Array.isArray(results.data)) {
    results.data.forEach((result: any) => {
      result[fieldName] = callback(result)
    })
  } else {
    results[fieldName] = callback(results)
    if (results.children && Array.isArray(results.children)) {
      results.children.forEach((result: any) => {
        result[fieldName] = callback(result)
      })
    }
  }

  return results
}

function pageTypeDecorator(results: any) {
  return contentResultsDecorator(results, 'page_type', function (content: any) {
    return SONG_TYPES_WITH_CHILDREN.includes(content['type']) ? 'song' : 'lesson'
  })
}

function needsAccessDecorator(results: any, userPermissions: any) {
  if (globalConfig.sanityConfig.useDummyRailContentMethods) return results
  const adapter = getPermissionsAdapter()
  return contentResultsDecorator(results, 'need_access', function (content: any) {
    return adapter.doesUserNeedAccess(content, userPermissions)
  })
}

function checkSanityConfig(config: Config): boolean {
  if (!config.sanityConfig.token) {
    console.warn('fetchSanity: The "token" property is missing in the config object.');
    return false;
  }
  if (!config.sanityConfig.projectId) {
    console.warn('fetchSanity: The "projectId" property is missing in the config object.');
    return false;
  }
  if (!config.sanityConfig.dataset) {
    console.warn('fetchSanity: The "dataset" property is missing in the config object.');
    return false;
  }
  if (!config.sanityConfig.version) {
    console.warn('fetchSanity: The "version" property is missing in the config object.');
    return false;
  }
  return true;
}
