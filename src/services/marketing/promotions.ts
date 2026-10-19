import { GET, POST } from '../../infrastructure/http/HttpClient'
import { decorateAsync } from '../../lib/sanity/decorators/base'
import type { Decoratable, FieldDecoratorAsync } from '../../lib/sanity/decorators/base'
import { Filters as f } from '../../lib/sanity/filter'
import { groq } from '../../lib/sanity/groq'
import type { GroqBuilder } from '../../lib/sanity/groq'
import type { PromotionalCampaignDocument } from '../../lib/sanity/types/marketing'
import { SanityQueryError } from '../../lib/sanity/runner'
import { AsyncEither } from '../../lib/ads/async-either'

const excludeFromGeneratedIndex = [
  'campaignQuery',
  'campaignProjection',
  'userCampaignStateDecorator',
  'decorateUserCampaignState',
]

// ============================================
// TYPES
// ============================================

export const USER_CAMPAIGN_STATE_FIELD = 'user_state' as const

/**
 * A campaign's placements are authored in Sanity, but whether a user still sees one is answered by
 * the backend. `decorateUserCampaignState` attaches the second to the first.
 */
export interface UserCampaignState {
  claimed: boolean
  dismissed: boolean
  eligible: boolean
}

export type WithUserCampaignState<T extends PromotionalCampaignDocument> = T & {
  user_state: UserCampaignState
}

export interface CampaignQueryOptions {
  /** Restricts the query to one campaign, or to any of several. */
  slug?: string | string[]
  /** The moment the campaign window is tested against. Defaults to now. */
  on?: Date
  /** Set false to return campaigns whose window does not cover `on`. */
  running?: boolean
  /** Set false to include campaigns that are toggled off in Sanity. */
  active?: boolean
}

const UNTOUCHED: UserCampaignState = { claimed: false, dismissed: false, eligible: true }

// ============================================
// UTILITIES
// ============================================

const filterCampaignsForUser = (campaigns: WithUserCampaignState<PromotionalCampaignDocument>[]) =>
  campaigns.filter(
    (campaign) =>
      campaign.user_state.eligible && !campaign.user_state.claimed && !campaign.user_state.dismissed
  )

// ============================================
// QUERY BUILDING
// ============================================

export const campaignProjection: string[] = [
  '...',
  'placements[]{ ..., "dark_mode_image": dark_mode_image.asset->url, "light_mode_image": light_mode_image.asset->url }',
]

function slugFilter(slug: CampaignQueryOptions['slug']): string {
  const slugs = (Array.isArray(slug) ? slug : [slug]).filter(Boolean) as string[]

  if (!slugs.length) return f.empty

  return slugs.length === 1 ? f.slug(slugs[0]) : f.slugIn(slugs)
}

export function campaignQuery(
  options: CampaignQueryOptions = {}
): GroqBuilder<PromotionalCampaignDocument[]> {
  const { slug, on = new Date(), running = true, active = true } = options

  return groq<PromotionalCampaignDocument[]>()
    .and(
      f.combine(
        f.type('promotional-campaign'),
        active && f.flag('active'),
        running && f.dateWithin('starts_at', 'ends_at', on.toISOString()),
        slugFilter(slug)
      )
    )
    .order('starts_at desc')
    .select(...campaignProjection)
    .default([])
}

// ============================================
// FETCHING
// ============================================

export async function fetchPromotionalCampaigns(
  options: CampaignQueryOptions = {}
): Promise<PromotionalCampaignDocument[]> {
  return campaignQuery(options).run().recover([])
}

/**
 * Every running campaign the user has not already claimed or dismissed, and is eligible.
 */
export async function fetchAvailablePromotionalCampaigns(
  options: CampaignQueryOptions = {}
): Promise<WithUserCampaignState<PromotionalCampaignDocument>[]> {
  return campaignQuery(options)
    .run()
    .flatMap(decorateUserCampaignState)
    .map(filterCampaignsForUser)
    .recover([])
}

/**
 * Fetches the state of every given campaign in a single request, keyed by slug. The backend leaves
 * out slugs it has no campaign for, so a missing key means the campaign is unknown to it.
 */
export async function fetchUserCampaignStates(
  slugs: string[]
): Promise<Record<string, UserCampaignState>> {
  if (!slugs.length) return {}

  const query = slugs.map((slug) => `slugs[]=${encodeURIComponent(slug)}`).join('&')

  return (await GET(`/api/promotions/v1/campaigns/state?${query}`)) ?? {}
}

// ============================================
// DECORATION
// ============================================

export function userCampaignStateDecorator(
  states: Record<string, UserCampaignState>
): FieldDecoratorAsync<Decoratable, typeof USER_CAMPAIGN_STATE_FIELD, UserCampaignState> {
  return {
    field: USER_CAMPAIGN_STATE_FIELD,
    compute: async (item) => {
      const campaign = item as unknown as PromotionalCampaignDocument

      return states[campaign.slug?.current] ?? UNTOUCHED
    },
  }
}

/**
 * Attaches each campaign's claim and dismiss state in a single backend request.
 */
export function decorateUserCampaignState<T extends PromotionalCampaignDocument>(
  campaigns: T[]
): AsyncEither<Error, WithUserCampaignState<T>[]> {
  return AsyncEither.attempt(async () => {
    if (!campaigns.length) return []

    const states = await fetchUserCampaignStates(campaigns.map((campaign) => campaign.slug.current))
    const { field, compute } = userCampaignStateDecorator(states)
    const decorated = await decorateAsync(campaigns as unknown as Decoratable[], field, compute)

    return decorated as unknown as WithUserCampaignState<T>[]
  })
}

// ============================================
// MUTATIONS
// ============================================

export async function claimPromotionalCampaign(slug: string): Promise<void> {
  await POST(`/api/promotions/v1/campaigns/${encodeURIComponent(slug)}/claim`)
}

export async function dismissPromotionalCampaign(slug: string): Promise<void> {
  await POST(`/api/promotions/v1/campaigns/${encodeURIComponent(slug)}/dismiss`)
}
