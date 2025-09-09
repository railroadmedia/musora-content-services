/**
 * @module Payments
 */
import { globalConfig } from './config.js'
import { fetchHandler } from '../lib/httpHelper.js'

export async function fetchCustomerPayments() {
    return await fetchHandler(globalConfig.baseUrl + '/api/customer/orders/v1', globalConfig.sessionConfig.authToken, 'get')
}
