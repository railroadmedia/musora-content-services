import { POST } from '../infrastructure/http/HttpClient'

export interface AlgoliaSearchRequest {
    query?: string
    hitsPerPage?: number
    page?: number
    [key: string]: unknown
}

export interface AlgoliaSearchResponse {
    // Shape varies by index configuration and query — MPB passes Algolia's response through unchanged
    results: unknown[]
}

export async function searchAlgolia(
    requests: AlgoliaSearchRequest[]
): Promise<AlgoliaSearchResponse> {
    return POST('/api/content/v1/search', { requests }) as Promise<AlgoliaSearchResponse>
}
