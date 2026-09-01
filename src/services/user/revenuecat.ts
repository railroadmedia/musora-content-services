/**
 * @module RevenueCat
 */
import { HttpClient } from '../../infrastructure/http/HttpClient'
import { globalConfig } from '../config'

const baseUrl = `/api/revenuecat`

export type RevenueCatPurchaseIntent =
  | 'new'
  | 'upgrade_higher_cost'
  | 'upgrade_lower_cost'
  | 'downgrade'
  | 'crossgrade'
  | 'unknown'

/**
 * Sends purchase_intent/previous_product_id metadata to BE for a given RevenueCat/Google
 * transaction, immediately after a purchase completes. Keyed by RC's own transaction id, so BE
 * can resolve it when the corresponding webhook's resulting order is synced later.
 *
 * Safe to retry -- idempotent on BE's side by transaction_id, so a duplicate call after a
 * network failure is harmless.
 *
 * @param transactionId - RC's transactionIdentifier for this purchase (from Purchases.getCustomerInfo())
 * @param purchaseIntent - The classification determined before the purchase was initiated
 * @param previousProductId - The RC product id being upgraded/downgraded/crossgraded from, if applicable
 * @returns {Promise<void>}
 * @throws {Error} - Throws an error if the request fails or if required parameters are missing.
 *
 * @example
 * sendRevenueCatPurchaseMetadata('GPA.3378-5280-5022-02864', 'upgrade_higher_cost', 'musora_subscription:annual-plus')
 *   .catch(error => console.error(error));
 */
export async function sendRevenueCatPurchaseMetadata(
  transactionId: string,
  purchaseIntent: RevenueCatPurchaseIntent,
  previousProductId?: string | null
): Promise<void> {
  if (!transactionId) {
    throw new Error('transactionId is a required parameter')
  }
  if (!purchaseIntent) {
    throw new Error('purchaseIntent is a required parameter')
  }

  const requestBody: { transaction_id: string; purchase_intent: string; previous_product_id?: string } = {
    transaction_id: transactionId,
    purchase_intent: purchaseIntent
  }

  // Only include previous_product_id if it has a valid value
  if (previousProductId) {
    requestBody.previous_product_id = previousProductId
  }

  const httpClient = new HttpClient(globalConfig.baseUrl)
  await httpClient.post<void>(`${baseUrl}/v1/purchase-metadata`, requestBody)
}
