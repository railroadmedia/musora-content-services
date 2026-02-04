/**
 * @module Scheduled
 */
import {
  artistOrInstructorName,
  getNewReleasesTypes,
  getUpcomingEventsTypes, instructorField,
} from '../../contentTypeConfig.js'
import { Brands } from '../../lib/brands'
import { Filters as f } from '../../lib/sanity/filter'
import { BuildQueryOptions, query } from '../../lib/sanity/query'
import { fetchSanity } from '../../lib/sanity/fetch'
import {
  getDateOnly,
  getSanityDate,
  getSortOrder,
  merge,
} from '../../lib/sanity/helper'
import { Instructor } from './instructor'

export interface NewRelease {
  id: number,
  title: string,
  image: string,
  thumbnail: string,
  artist_name: string,
  instructor: Instructor[],
  artists: string[],
  difficulty: number,
  difficulty_string: string,
  length_in_seconds: number,
  published_on: string,
  show_in_new_feed: boolean,
  type: string,
  permission_id: number[],
}

export interface NewAndUpcomingRelease extends NewRelease {
  isLive: boolean,
  live_event_start_time: string,
  live_event_end_time: string,
}

const baseFields = [
  `"id": railcontent_id`,
  `title`,
  `"type": _type`,
  `"image": thumbnail.asset->url`,
  `"thumbnail": thumbnail.asset->url`,
  `${artistOrInstructorName()}`,
  `"instructor": ${instructorField}`,
  `"artists": instructor[]->name`,
  `difficulty`,
  `difficulty_string`,
  `length_in_seconds`,
  `published_on`,
  `"permission_id": permission_v2`,
  `show_in_new_feed`,
]

function getNewAndScheduledContentFilter(brand: string, now: string, status: "new"|"scheduled"|"all") {
  const upcomingTypes = getUpcomingEventsTypes(brand)
  const newTypes = getNewReleasesTypes(brand)

  let clauses: string[] = []
  let types: string[]
  let statuses: string[]

  switch (status) {
    case "new":
      types = newTypes
      statuses = ['published']
      clauses = [
        f.publishedBefore(now),
      ]
      break
    case "scheduled":
      types = upcomingTypes
      statuses = ['published', 'scheduled']
      clauses = [
        f.publishedAfter(now),
        f.combineOr(
          f.notDefined('live_event_end_time'),
          `live_event_end_time < ${now}`,
        )
      ]
      break
    case "all":
    default:
      types = merge(upcomingTypes, newTypes)
      statuses = ['published', 'scheduled']
  }

  return f.combine(
    f.typeIn(types),
    f.brand(brand),
    f.statusIn(statuses),
    "show_in_new_feed == true",
    ...clauses
  )
}

function getLiveEventFilter(brand: string, now: string) {
  return f.combine(
    f.defined('live_event_start_time'),
    f.combineOr(
      f.notDefined('live_event_end_time'),
      `live_event_end_time >= ${now}`,
    ),
    f.combineOr(
      f.brand(brand),
      f.combine(
        f.brand('musora'),
        "live_global_event == true",
      )
    ),
    f.statusIn(['scheduled'])
  )
}

export async function fetchNewUpcomingAndLive(
  brand: Brands|string,
  {
    page = 1,
    limit = 20,
    sort = 'published_on'
  }: BuildQueryOptions = {}
): Promise<NewAndUpcomingRelease[]> {
  const now = getSanityDate(new Date())

  const start = (page - 1) * limit
  const end = start + limit
  const sortOrder = getSortOrder(sort, brand)

  // can be used for fetchScheduledReleases()
  const newAndUpcomingFilter = getNewAndScheduledContentFilter(brand, now, "all")

  // can be reused for fetchUpcomingEvents()
  const liveEventFilter = getLiveEventFilter(brand, now)

  const fields = [
    ...baseFields,
    `"isLive": live_event_start_time <= '${now}' && (!defined(live_event_end_time) || live_event_end_time >= '${now}')`,
  ]

  const q = query()
    .and(newAndUpcomingFilter)
    .or(liveEventFilter)
    .slice(start, end)
    .order(sortOrder)
    .select(...fields)
    .build()

  return fetchSanity(q, true)
}

export async function fetchNewReleases(
  brand: Brands|string,
  {
    page = 1,
    limit = 20,
    sort = 'published_on'
  }: BuildQueryOptions = {}
): Promise<NewRelease[]> {
  const start = (page - 1) * limit
  const end = start + limit
  const sortOrder = getSortOrder(sort, brand)
  const now = getDateOnly()

  const filter = getNewAndScheduledContentFilter(brand, now, "new")

  const q = query()
    .and(filter)
    .slice(start, end)
    .order(sortOrder)
    .select(...baseFields)
    .build()

  return fetchSanity(q, true)
}

export async function fetchScheduledReleases(
  brand: Brands|string,
  {
    page = 1,
    limit = 10
  }: BuildQueryOptions = {}
): Promise<NewRelease[]> {
  const now = getSanityDate(new Date())
  const start = (page - 1) * limit
  const end = start + limit
  const sortOrder = getSortOrder("published_on", brand)

  const filter = getNewAndScheduledContentFilter(brand, now, "scheduled")

  const q = query()
    .and(filter)
    .slice(start, end)
    .order(sortOrder)
    .select(...baseFields)
    .build()

  return fetchSanity(q, true)
}

export async function fetchUpcomingEvents(
  brand: Brands|string,
  {
    page = 1,
    limit = 10
  }: BuildQueryOptions = {}
): Promise<NewAndUpcomingRelease[]> {
  const now = getSanityDate(new Date())

  const start = (page - 1) * limit
  const end = start + limit
  const sortOrder = getSortOrder("published_on", brand)

  const filter = getLiveEventFilter(brand, now)

  const fields = [
    ...baseFields,
    `live_event_start_time`,
    `live_event_end_time`,
    `"isLive": live_event_start_time <= '${now}' && live_event_end_time >= '${now}'`,
  ]

  const q = query()
    .and(filter)
    .slice(start, end)
    .order(sortOrder)
    .select(...fields)
    .build()

  return fetchSanity(q, true)
}
