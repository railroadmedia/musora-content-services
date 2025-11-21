export interface BuildQueryOptions {
  sort: string
  start: number
  end: number
  isSingle?: boolean
  withoutPagination?: boolean
}

export function buildDataAndTotalQuery(
  filter: string = '',
  fields: string = '...',
  {
    sort = 'published_on desc',
    start = 0,
    end = 10,
    isSingle = false,
    withoutPagination = false,
  }: BuildQueryOptions
): string {
  const sortString = sort ? ` | order(${sort})` : ''
  const countString = isSingle ? '[0...1]' : withoutPagination ? `` : `[${start}...${end}]`
  const query = `{
      "data": *[${filter}]  ${sortString}${countString}
      {
        ${fields}
      },
      "total": count(*[${filter}]),
    }`
  return query
}
