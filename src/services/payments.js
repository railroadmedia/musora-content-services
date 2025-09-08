/**
 * @module Payments
 */
import { globalConfig } from './config.js'
import { HttpClient} from '../infrastructure/http/index.js'

export async function fetchCustomerPayments(brand, { page = 1, limit = 10 } = {}) {
  const httpClient = new HttpClient(globalConfig.baseUrl, globalConfig.sessionConfig.token)
  return httpClient.get('/api/customer/orders/v1')
  // return {
  //   data: results.entity,
  //   meta: {}
  // };
}
