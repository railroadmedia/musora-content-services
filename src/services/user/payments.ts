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

/**
 * Fetches a list of orders (from Shopify) for the authenticated user (customer).
 *
 * @returns {Promise<CustomerOrder[]>} - A promise that resolves to an array of customer order objects.
 * @throws {HttpError} - Throws HttpError if the request fails.
 */
export async function fetchCustomerPayments(): Promise<CustomerOrder[]> {
  const client = new HttpClient(globalConfig.baseUrl, globalConfig.sessionConfig.authToken)
  return await client.get<CustomerOrder[]>('/api/customer/orders/v1')
}
