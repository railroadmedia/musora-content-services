import { Monoid } from '../ads/monoid'

export interface BuildQueryOptions {
  sort?: string
  offset?: number
  limit?: number
}

export type Projection = string[]

export interface QueryBuilderState {
  filter: string
  ordering: string
  slice: string
  projection: string
  postFilter: string
  selector: string
}

export interface QueryBuilder {
  selector(selector: string): QueryBuilder
  and(expr: string): QueryBuilder
  or(...exprs: string[]): QueryBuilder
  order(expr: string): QueryBuilder
  slice(offset: number, limit?: number): QueryBuilder
  first(): QueryBuilder
  select(...fields: string[]): QueryBuilder
  postFilter(expr: string): QueryBuilder
  build(): string

  _state(): QueryBuilderState
}

const and: Monoid<string> = {
  empty: '',
  concat: (a, b) => (!a ? b : !b ? a : `${a} && ${b}`),
}

const or: Monoid<string> = {
  empty: '',
  concat: (a, b) => (!a ? b : !b ? a : `(${a} || ${b})`),
}

const order: Monoid<string> = {
  empty: '',
  concat: (a, b) => `| order(${b || a})`,
}

const slice: Monoid<string> = {
  empty: '',
  concat: (a, b) => b || a,
}

const project: Monoid<string> = {
  empty: '',
  concat: (a, b) => (!a ? b : !b ? a : `${a}, ${b}`),
}

export const filterOps = { and, or }

export const query = (selector?: string): QueryBuilder => {
  let state: QueryBuilderState = {
    filter: and.empty,
    ordering: order.empty,
    slice: slice.empty,
    projection: project.empty,
    postFilter: and.empty,
    selector: selector || '*',
  }

  const builder: QueryBuilder = {
    selector(selector: string) {
      state.selector = selector
      return builder
    },

    // main filters
    and(expr: string) {
      state.filter = and.concat(state.filter, expr)
      return builder
    },

    or(...exprs: string[]) {
      const orExpr = exprs.reduce(or.concat, or.empty)
      state.filter = and.concat(state.filter, orExpr)
      return builder
    },

    // sorting
    order(expr: string) {
      state.ordering = order.concat(state.ordering, expr)
      return builder
    },

    // pagination / slicing
    slice(offset: number = 0, limit?: number) {
      const sliceExpr = !limit ? `[${offset}]` : `[${offset}...${offset + limit}]`

      state.slice = slice.concat(state.slice, sliceExpr)
      return builder
    },

    first() {
      return this.slice()
    },

    // projection
    select(...fields: string[]) {
      state.projection = fields.reduce(project.concat, state.projection)
      return builder
    },

    // post filters
    postFilter(expr: string) {
      state.postFilter = and.concat(state.postFilter, expr)
      return builder
    },

    build() {
      const { selector, filter, postFilter, projection, ordering, slice } = state

      return `
        ${selector}[${filter}]
        ${projection.length > 0 ? `{ ${projection} }` : ''}
        ${postFilter ? `[${postFilter}]` : ''}
        ${ordering}
        ${slice}
      `.trim()
    },

    _state() {
      return state
    },
  }

  return builder
}
