/**
 * @module Payments
 */
import { HttpClient } from '../../infrastructure/http/HttpClient'
import { globalConfig } from '../config.js'
import { HttpClient, HttpError } from '../../infrastructure/http'
import { Either } from '../../core/types/ads/either'

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
 * @returns {Promise<Either<HttpError, CustomerOrder[]>>} - A promise that resolves to an array of customer order objects.
 */
export async function fetchCustomerPayments(): Promise<Either<HttpError, CustomerOrder[]>> {
  const client = new HttpClient(globalConfig.baseUrl, globalConfig.sessionConfig.authToken)
  return client.get<CustomerOrder[]>('/api/customer/orders/v1')
}
