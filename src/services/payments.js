/**
 * @module Payments
 */
import { globalConfig } from './config.js'

export async function fetchCustomerPayments(brand, { page = 1, limit = 10 } = {}) {
  const params = {
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${globalConfig.sessionConfig.authToken}`,
        'Content-Type': 'application/json',
      }
    }
    return await fetch(globalConfig.baseUrl + '/api/customer/orders/v1', params)
}
