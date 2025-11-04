/**
 * @module Payments
 */
import { HttpClient } from '../../infrastructure/http/HttpClient'
import { globalConfig } from '../config.js'

interface CustomerOrder {
  id: string
  line_item_title: string
  date: string
  total_price: string
  currency: string
  status_url: string
}

interface PaginationMeta {
  hasNextPage: boolean
  hasPreviousPage: boolean
  startCursor: string | null
  endCursor: string | null
}

interface CustomerOrdersResponse {
  data: CustomerOrder[]
  meta: {
    pagination: PaginationMeta
  }
}

interface FetchCustomerPaymentsOptions {
  perPage?: number
  cursor?: string | null
}

/**
 * Fetches a list of orders (from Shopify) for the authenticated user (customer).
 *
 * @param {FetchCustomerPaymentsOptions} options - Pagination options
 * @param {number} options.perPage - Number of orders per page (1-100, default: 40)
 * @param {string|null} options.cursor - Cursor for pagination
 * @returns {Promise<CustomerOrdersResponse>} - A promise that resolves to customer orders with pagination metadata
 * @throws {HttpError} - Throws HttpError if the request fails.
 *
 * @example
 * // Fetch first page with default page size (40)
 * const response = await fetchCustomerPayments()
 *
 * @example
 * // Fetch first page with custom page size
 * const response = await fetchCustomerPayments({ perPage: 20 })
 *
 * @example
 * // Fetch next page using cursor from previous response
 * const response = await fetchCustomerPayments({
 *   perPage: 20,
 *   cursor: previousResponse.meta.pagination.endCursor
 * })
 */
export async function fetchCustomerPayments(
  options: FetchCustomerPaymentsOptions = {}
): Promise<CustomerOrdersResponse> {
  const client = new HttpClient(globalConfig.baseUrl, globalConfig.sessionConfig.authToken)
  const params = new URLSearchParams()
  if (options.perPage) {
    params.append('per_page', options.perPage.toString())
  }
  if (options.cursor) {
    params.append('cursor', options.cursor)
  }
  console.log(options)
  const queryString = params.toString()
  const url = queryString ? `/api/customer/orders/v1?${queryString}` : '/api/customer/orders/v1'

  return await client.get<CustomerOrdersResponse>(url)
}
