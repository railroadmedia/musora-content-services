import { Brand } from '../brands'

export interface BuildQueryOptions {
  sort: string
  start: number
  end: number
  paginated: boolean
  isSingle?: boolean
}

export function buildDataAndTotalQuery(
  filter: string = '',
  fields: string = '...',
  {
    sort = 'published_on desc',
    start = 0,
    end = 10,
    isSingle = false,
    paginated = true,
  }: BuildQueryOptions
): string {
  const sortString = sort ? ` | order(${sort})` : ''
  const countString = isSingle ? '[0...1]' : paginated ? `[${start}...${end}]` : ``
  const query = `{
      "data": *[${filter}]  ${sortString}${countString}
      {
        ${fields}
      },
      "total": count(*[${filter}]),
    }`
  return query
}

export function getSortOrder(sort = '-published_on', brand: Brand, groupBy?: string): string {
  const sanitizedSort = sort?.trim() || '-published_on'
  let isDesc = sanitizedSort.startsWith('-')
  const sortField = isDesc ? sanitizedSort.substring(1) : sanitizedSort

  let sortOrder = ''

  switch (sortField) {
    case 'slug':
      sortOrder = groupBy ? 'name' : '!defined(title), lower(title)'
      break

    case 'popularity':
      if (groupBy == 'artist' || groupBy == 'genre') {
        sortOrder = isDesc ? `coalesce(popularity.${brand}, -1)` : 'popularity'
      } else {
        sortOrder = isDesc ? 'coalesce(popularity, -1)' : 'popularity'
      }
      break

    case 'recommended':
      sortOrder = 'published_on'
      isDesc = true
      break

    default:
      sortOrder = sortField
      break
  }

  sortOrder += isDesc ? ' desc' : ' asc'
  return sortOrder
}
