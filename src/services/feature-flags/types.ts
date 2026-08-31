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

export type ExposureReport = {
  flag: string
  variant: string
  version: number
  reason: EvaluationReason
}
