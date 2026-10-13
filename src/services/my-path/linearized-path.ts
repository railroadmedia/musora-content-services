/**
 * @module MyPathLinearizedPath
 */

import { GET } from '../../infrastructure/http/HttpClient'
import { fetchLinearizedPathOnce } from './cache'

const LINEARIZED_PATH_PATH = `/api/my-path/v2/linearized-path`

function linearizedPathUrl(brand: string): string {
  return `${LINEARIZED_PATH_PATH}?brand=${brand}`
}

export interface LinearizedPathResponse {
  linearized_learning_paths: Record<string, any>
}

export async function fetchLinearizedLearningPaths(brand: string): Promise<LinearizedPathResponse | null> {
  const response = await fetchLinearizedPathOnce<LinearizedPathResponse | ''>(brand, () =>
    GET(linearizedPathUrl(brand)) as Promise<LinearizedPathResponse | ''>,
  )
  return response || null
}
