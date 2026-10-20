/**
 * @module FeatureFlags
 */

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
 * No brand. A flag has none -- brand is a targeting rule -- and the server files
 * an exposure under the brand of the request that carries it.
 */
export type ExposureReport = {
  flag: string
  variant: string
  version: number
  reason: EvaluationReason
}
