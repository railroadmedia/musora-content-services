/**
 * @module FeatureFlags
 */

import type { Brand } from '../../lib/brands'

export type EvaluationReason =
  | 'override'
  | 'rule'
  | 'rollout'
  | 'holdout'
  | 'default'
  | 'disabled'
  | 'not_found'

export type FeatureFlagEntry = {
  variant: string | null
  value: unknown
  version: number
  reason: EvaluationReason
}

export type FeatureFlagPayload = Record<string, FeatureFlagEntry>

/**
 * The brand is carried here only so that pending reports can be grouped by it.
 * It is sent once per request, not on each report: a flag has no brand of its
 * own since brand became a targeting rule, and the server files a whole batch
 * under the brand the request names.
 */
export type ExposureReport = {
  flag: string
  variant: string
  version: number
  reason: EvaluationReason
  brand: Brand
}
