import { AsyncEither } from '../../../src/lib/ads/async-either'
import { Either } from '../../../src/lib/ads/either'
import { Filters as f } from '../../../src/lib/sanity/filter'
import * as HttpClient from '../../../src/infrastructure/http/HttpClient'
import * as runner from '../../../src/lib/sanity/runner'
import {
  campaignProjection,
  campaignQuery,
  decorateUserCampaignState,
  fetchAvailablePromotionalCampaigns,
  fetchUserCampaignStates,
  userCampaignStateDecorator,
} from '../../../src/services/marketing/promotions'
import type { PromotionalCampaignDocument } from '../../../src/lib/sanity/types/marketing'

jest.mock('../../../src/lib/sanity/runner', () => ({
  ...jest.requireActual('../../../src/lib/sanity/runner'),
  run: jest.fn(),
}))

const campaignDocument = (slug: string) =>
  ({
    _type: 'promotional-campaign',
    slug: { _type: 'slug', current: slug },
  }) as unknown as PromotionalCampaignDocument

const queryResolving = (campaigns: PromotionalCampaignDocument[]) =>
  jest
    .mocked(runner.run)
    .mockReturnValue(
      AsyncEither.of(Promise.resolve(Either.right(campaigns))) as ReturnType<typeof runner.run>
    )

const on = new Date('2026-11-25T12:00:00.000Z')

describe('date and flag filters', () => {
  test('dateBefore and dateAfter compare the given field', () => {
    expect(f.dateBefore('ends_at', '2026-01-01')).toBe('ends_at <= "2026-01-01"')
    expect(f.dateAfter('starts_at', '2026-01-01')).toBe('starts_at >= "2026-01-01"')
  })

  test('dateWithin brackets a window around the date', () => {
    expect(f.dateWithin('starts_at', 'ends_at', '2026-01-01')).toBe(
      'starts_at <= "2026-01-01" && ends_at >= "2026-01-01"'
    )
  })

  test('flag defaults to matching true', () => {
    expect(f.flag('active')).toBe('active == true')
    expect(f.flag('active', false)).toBe('active == false')
  })

  test('fieldEquals escapes the value', () => {
    expect(f.fieldEquals('key', 'upgrade-banner')).toBe('key == "upgrade-banner"')
    expect(f.fieldEquals('key', 'say "hi"')).toBe('key == "say \\"hi\\""')
  })
})

describe('campaignProjection', () => {
  test('resolves both placement image references to urls', () => {
    expect(campaignProjection).toEqual([
      '...',
      'placements[]{ ..., "dark_mode_image": dark_mode_image.asset->url, "light_mode_image": light_mode_image.asset->url }',
    ])
  })
})

describe('campaignQuery', () => {
  test('returns every running campaign rather than a single one', () => {
    const built = campaignQuery({ on }).build()

    expect(built).toContain('_type == "promotional-campaign"')
    expect(built).toContain('active == true')
    expect(built).toContain('starts_at <= "2026-11-25T12:00:00.000Z"')
    expect(built).toContain('ends_at >= "2026-11-25T12:00:00.000Z"')
    expect(built).not.toContain('[0]')
  })

  test('filters by slug when one is given', () => {
    expect(campaignQuery({ slug: 'black-friday-2026', on }).build()).toContain(
      'slug.current == "black-friday-2026"'
    )
  })

  test('filters by a list of slugs when several are given', () => {
    expect(
      campaignQuery({ slug: ['black-friday-2026', 'cyber-monday-2026'], on }).build()
    ).toContain("slug.current in ['black-friday-2026','cyber-monday-2026']")
  })

  test('uses an equality filter for a single-entry slug list', () => {
    const built = campaignQuery({ slug: ['black-friday-2026'], on }).build()

    expect(built).toContain('slug.current == "black-friday-2026"')
    expect(built).not.toContain('slug.current in')
  })

  test('ignores an empty slug list', () => {
    expect(campaignQuery({ slug: [], on }).build()).not.toContain('slug.current')
  })

  test('drops the window when running is false', () => {
    const built = campaignQuery({ on, running: false }).build()

    expect(built).not.toContain('starts_at <=')
    expect(built).not.toContain('ends_at >=')
    expect(built).toContain('active == true')
  })

  test('drops the active flag when active is false', () => {
    const built = campaignQuery({ on, active: false }).build()

    expect(built).not.toContain('active ==')
    expect(built).toContain('starts_at <= "2026-11-25T12:00:00.000Z"')
  })

  test('orders the newest campaign first', () => {
    expect(campaignQuery({ on }).build()).toContain('order(starts_at desc)')
  })

  test('is not scoped to a brand', () => {
    expect(campaignQuery({ on }).build()).not.toContain('brand')
  })
})

describe('userCampaignStateDecorator', () => {
  const campaign = (slug: string) => ({ slug: { _type: 'slug', current: slug } })

  test('matches a campaign to its state by slug', async () => {
    const { field, compute } = userCampaignStateDecorator({
      'black-friday-2026': { claimed: true, dismissed: false },
    })

    expect(field).toBe('user_state')
    await expect(compute(campaign('black-friday-2026') as never)).resolves.toEqual({
      claimed: true,
      dismissed: false,
    })
  })

  test('treats a campaign the backend did not report as untouched', async () => {
    const { compute } = userCampaignStateDecorator({})

    await expect(compute(campaign('unknown') as never)).resolves.toEqual({
      claimed: false,
      dismissed: false,
    })
  })
})

describe('fetchUserCampaignStates', () => {
  afterEach(() => jest.restoreAllMocks())

  test('does not reach the backend when there are no slugs', async () => {
    const get = jest.spyOn(HttpClient, 'GET')

    await expect(fetchUserCampaignStates([])).resolves.toEqual({})
    expect(get).not.toHaveBeenCalled()
  })

  test('asks for every slug in one request', async () => {
    const get = jest.spyOn(HttpClient, 'GET').mockResolvedValue({})

    await fetchUserCampaignStates(['black-friday-2026', 'cyber monday'])

    expect(get).toHaveBeenCalledTimes(1)
    expect(get).toHaveBeenCalledWith(
      '/api/promotions/v1/campaigns/state?slugs[]=black-friday-2026&slugs[]=cyber%20monday'
    )
  })

  test('reads an empty body as no states', async () => {
    jest.spyOn(HttpClient, 'GET').mockResolvedValue(null)

    await expect(fetchUserCampaignStates(['black-friday-2026'])).resolves.toEqual({})
  })
})

describe('decorateUserCampaignState', () => {
  afterEach(() => jest.restoreAllMocks())

  test('attaches the state the backend reported', async () => {
    jest
      .spyOn(HttpClient, 'GET')
      .mockResolvedValue({ 'black-friday-2026': { claimed: true, dismissed: false } })

    const result = await decorateUserCampaignState([campaignDocument('black-friday-2026')])

    expect(result.drop()).toEqual([
      expect.objectContaining({ user_state: { claimed: true, dismissed: false } }),
    ])
  })

  test('treats a campaign the backend did not report as untouched', async () => {
    jest.spyOn(HttpClient, 'GET').mockResolvedValue({})

    const result = await decorateUserCampaignState([campaignDocument('unknown')])

    expect(result.drop()).toEqual([
      expect.objectContaining({ user_state: { claimed: false, dismissed: false } }),
    ])
  })

  test('does not reach the backend when there are no campaigns', async () => {
    const get = jest.spyOn(HttpClient, 'GET')
    const result = await decorateUserCampaignState([])

    expect(result.drop()).toEqual([])
    expect(get).not.toHaveBeenCalled()
  })

  test('turns a failed state request into a left', async () => {
    const error = new Error('network')
    jest.spyOn(HttpClient, 'GET').mockRejectedValue(error)

    const result = await decorateUserCampaignState([campaignDocument('black-friday-2026')])

    expect(result.isLeft()).toBe(true)
    expect(result.drop()).toBe(error)
  })
})

describe('fetchAvailablePromotionalCampaigns', () => {
  afterEach(() => jest.restoreAllMocks())

  test('drops campaigns the user already claimed or dismissed', async () => {
    queryResolving([
      campaignDocument('claimed'),
      campaignDocument('dismissed'),
      campaignDocument('untouched'),
    ])
    jest.spyOn(HttpClient, 'GET').mockResolvedValue({
      claimed: { claimed: true, dismissed: false },
      dismissed: { claimed: false, dismissed: true },
    })

    const result = await fetchAvailablePromotionalCampaigns()

    expect(result.drop()).toEqual([
      expect.objectContaining({ slug: { _type: 'slug', current: 'untouched' } }),
    ])
  })

  test('keeps a failed query as a left without asking for state', async () => {
    const error = new runner.SanityQueryError('boom', '*')
    jest
      .mocked(runner.run)
      .mockReturnValue(
        AsyncEither.of(Promise.resolve(Either.left(error))) as ReturnType<typeof runner.run>
      )
    const get = jest.spyOn(HttpClient, 'GET')

    const result = await fetchAvailablePromotionalCampaigns()

    expect(result.drop()).toBe(error)
    expect(get).not.toHaveBeenCalled()
  })
})
