/**
 * @module Payments
 */
import { globalConfig } from '../config.js'
import { HttpClient } from '../../infrastructure/http'

/**
 * Fetches a list of orders (from Shopify) for the authenticated user (customer).
 *
 * @returns {Promise<Array>} - A promise that resolves to an array of customer order objects (if exists).
 */
export async function fetchCustomerPayments(): Promise<any> {
    const client = new HttpClient(globalConfig.baseUrl, globalConfig.sessionConfig.authToken)
    const response = await client.get('/api/customer/orders/v1')
    return response.data
}
