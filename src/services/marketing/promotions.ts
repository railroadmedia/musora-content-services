import { GET, POST } from '../../infrastructure/http/HttpClient'
import { decorateAsync } from '../../lib/sanity/decorators/base'
import type { Decoratable, FieldDecoratorAsync } from '../../lib/sanity/decorators/base'
import { Filters as f } from '../../lib/sanity/filter'
import { groq } from '../../lib/sanity/groq'
import type { GroqBuilder } from '../../lib/sanity/groq'
import type { PromotionalCampaignDocument } from '../../lib/sanity/types/marketing'
import { AsyncEither } from '../../lib/ads/async-either'
import { Brand } from '../../lib/brands'

const excludeFromGeneratedIndex = [
  'campaignQuery',
  'campaignProjection',
  'userCampaignStateDecorator',
  'decorateUserCampaignState',
]

// ============================================
// TYPES
// ============================================

type PlacementDocument = PromotionalCampaignDocument['placements'][number]

/** A placement as `campaignProjection` returns it, with both images resolved to CDN urls. */
export type PromotionalCampaignPlacement = Omit<
  PlacementDocument,
  'dark_mode_image' | 'light_mode_image'
> & {
  dark_mode_image?: string
  light_mode_image?: string
}

export type PromotionalCampaign = Omit<PromotionalCampaignDocument, 'placements'> & {
  placements: PromotionalCampaignPlacement[]
}

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

export type WithUserCampaignState<T extends PromotionalCampaign> = T & {
  user_state: UserCampaignState
}

export interface CampaignQueryOptions {
  /** Restricts the query to one brand's campaigns. */
  brand?: Brand
  /** Restricts the query to one campaign, or to any of several. */
  slug?: string | string[]
  /** The moment the campaign window is tested against. Defaults to now. */
  on?: Date
  /** Set false to return campaigns whose window does not cover `on`. */
  running?: boolean
  /** Set false to include campaigns that are toggled off in Sanity. */
  active?: boolean
}

export interface AvailableCampaignOptions extends CampaignQueryOptions {
  /** Values for the `{name}` placeholders in placement copy. See `resolveCampaignPlaceholders`. */
  placeholderValues?: CampaignPlaceholderValues
  /** Set true to drop campaigns the user is not eligible for, has claimed, or has dismissed. */
  filterByUserState?: boolean
}

const UNTOUCHED: UserCampaignState = { claimed: false, dismissed: false, eligible: true }

// ============================================
// UTILITIES
// ============================================

const filterCampaignsForUser = (campaigns: WithUserCampaignState<PromotionalCampaign>[]) =>
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
): GroqBuilder<PromotionalCampaign[]> {
  const { brand, slug, on = new Date(), running = true, active = true } = options

  return groq<PromotionalCampaign[]>()
    .and(
      f.combine(
        f.type('promotional-campaign'),
        brand && f.brand(brand),
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
): Promise<PromotionalCampaign[]> {
  return campaignQuery(options).run().recover([])
}

/**
 * Every running campaign with the user's state attached. With `filterByUserState`, only those the
 * user is eligible for and has not claimed or dismissed.
 */
export async function fetchAvailablePromotionalCampaigns(
  options: AvailableCampaignOptions = {}
): Promise<WithUserCampaignState<PromotionalCampaign>[]> {
  const { placeholderValues = {}, filterByUserState = false, ...queryOptions } = options

  return campaignQuery(queryOptions)
    .run()
    .flatMap(decorateUserCampaignState)
    .map((campaigns) => (filterByUserState ? filterCampaignsForUser(campaigns) : campaigns))
    .map((campaigns) =>
      campaigns.map((campaign) => resolveCampaignPlaceholders(campaign, placeholderValues))
    )
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
      const campaign = item as unknown as PromotionalCampaign

      return states[campaign.slug?.current] ?? UNTOUCHED
    },
  }
}

/**
 * Attaches each campaign's claim and dismiss state in a single backend request.
 */
export function decorateUserCampaignState<T extends PromotionalCampaign>(
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
// PLACEHOLDERS
// ============================================

export type CampaignPlaceholderValues = Record<string, string>

const PLACEHOLDER = /\{(\w+)\}/g

const COPY_FIELDS = ['title', 'body', 'disclaimer', 'cta_label'] as const

const fillPlaceholders = (text: string, values: CampaignPlaceholderValues) =>
  text.replace(
    PLACEHOLDER,
    (placeholder, name: string) => values[name.toLowerCase()] ?? placeholder
  )

const lowercaseKeys = (values: CampaignPlaceholderValues): CampaignPlaceholderValues =>
  Object.fromEntries(Object.entries(values).map(([name, value]) => [name.toLowerCase(), value]))

function resolvePlacementPlaceholders(
  placement: PromotionalCampaignPlacement,
  values: CampaignPlaceholderValues
): PromotionalCampaignPlacement {
  const resolved = { ...placement }

  for (const field of COPY_FIELDS) {
    if (resolved[field]) resolved[field] = fillPlaceholders(resolved[field], values)
  }

  return resolved
}

/**
 * Replaces `{name}` placeholders in each placement's copy with the given values. A placeholder with
 * no value is left as it is. Names match regardless of case, so `{price}` and `{PRICE}` both fill.
 */
export function resolveCampaignPlaceholders<T extends PromotionalCampaign>(
  campaign: T,
  values: CampaignPlaceholderValues
): T {
  const valuesByName = lowercaseKeys(values)

  return {
    ...campaign,
    placements: (campaign.placements ?? []).map((placement) =>
      resolvePlacementPlaceholders(placement, valuesByName)
    ),
  }
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
