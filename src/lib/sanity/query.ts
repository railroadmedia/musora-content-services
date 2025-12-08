import { Monoid } from '../ads/monoid'
import { Semigroup } from '../ads/semigroup'

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
}

export interface QueryBuilder {
  and(expr: string): QueryBuilder
  or(...exprs: string[]): QueryBuilder
  order(expr: string): QueryBuilder
  slice(start: number, end: number): QueryBuilder
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

const project: Semigroup<string> = {
  concat: (a, b) => `${a}, ${b}`,
}

export const query = (): QueryBuilder => {
  let state: QueryBuilderState = {
    filter: and.empty,
    ordering: order.empty,
    slice: slice.empty,
    projection: '_id',
    postFilter: and.empty,
  }

  const builder: QueryBuilder = {
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
    slice(start: number = 0, end?: number) {
      const sliceExpr = !end ? `[${start}]` : `[${start}...${end}]`

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
      const { filter, ordering, slice, projection } = state

      return `
        *[${filter}]
          ${ordering}
          ${slice}
        { ${projection} }
        ${state.postFilter ? `[${state.postFilter}]` : ''}
      `.trim()
    },

    _state() {
      return state
    },
  }

  return builder
}
