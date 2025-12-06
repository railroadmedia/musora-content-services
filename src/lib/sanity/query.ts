export interface BuildQueryOptions {
  sort?: string
  offset?: number
  limit?: number
  paginated?: boolean
  postQuery?: string
}

export interface FilterOptions {
  data: {
    filter: string
    fields: string
    post?: string
  }
  total: {
    filter: string
    fields?: string
    post?: string
  }
}

// TODO: to be removed in the future
export function buildDataAndTotalQuery(
  filter: string = '',
  fields: string = '...',
  options: BuildQueryOptions
): string {
  const query = `{
      "data": *[${filter}]
      {
        ${fields}
      } | ${QueryHelper.sort(options)}${QueryHelper.paginate(options)} ,
      "total": count(*[${filter}]),
    }`
  return query
}

export class QueryHelper {
  static sort(options: BuildQueryOptions): string {
    return options.sort ? ` order(${options.sort}) ` : ''
  }

  static paginate(options: BuildQueryOptions): string {
    return options.offset && options.limit && options.paginated
      ? `[${options.offset}...${options.offset + options.limit}]`
      : ``
  }

  // TODO: I don't like this but for now I'll keep it here
  static buildQuery(filters: FilterOptions, options: BuildQueryOptions): string {
    return `{
      "data": *[${filters.data.filter}]
      {
        ${filters.data.fields}
      } ${filters.data.post ? `[${filters.data.post}]` : ''}
      | ${this.sort(options)}${QueryHelper.paginate(options)} ,
      "total": count(*[${filters.data.filter}]
        ${filters.total.fields ? `{${filters.total.fields}}` : ''}
        ${filters.total.post ? `[${filters.total.post}]` : ''},
      )
    }`
  }
}
