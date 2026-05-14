export interface Decoratable {
  children?: Decoratable[]
  [key: string]: unknown
}

export type DecorateFn<T, V> = (item: T) => V

export type DecorateFnAsync<T, V> = (item: T) => Promise<V>

export interface FieldDecorator<
  T extends Decoratable,
  K extends string = string,
  V = unknown,
> {
  field: K
  compute: DecorateFn<T, V>
}

export interface FieldDecoratorAsync<
  T extends Decoratable,
  K extends string = string,
  V = unknown,
> {
  field: K
  compute: DecorateFnAsync<T, V>
}

type Decorated<T, K extends string, V> = T & { [P in K]: V }

const MAX_CHILD_DEPTH = 3

export function decorate<T extends Decoratable, K extends string, V>(
  items: T[],
  field: K,
  compute: DecorateFn<T, V>
): Decorated<T, K, V>[]
export function decorate<T extends Decoratable, K extends string, V>(
  items: T,
  field: K,
  compute: DecorateFn<T, V>
): Decorated<T, K, V>
export function decorate<T extends Decoratable, K extends string, V>(
  items: T | T[],
  field: K,
  compute: DecorateFn<T, V>
): Decorated<T, K, V> | Decorated<T, K, V>[] {
  const list = Array.isArray(items) ? items : [items]
  for (const item of list) visit(item, [{ field, compute }], 0)
  return items as Decorated<T, K, V> | Decorated<T, K, V>[]
}

export function decorateAll<T extends Decoratable>(
  items: T[],
  decorators: ReadonlyArray<FieldDecorator<T>>
): T[]
export function decorateAll<T extends Decoratable>(
  items: T,
  decorators: ReadonlyArray<FieldDecorator<T>>
): T
export function decorateAll<T extends Decoratable>(
  items: T | T[],
  decorators: ReadonlyArray<FieldDecorator<T>>
): T | T[] {
  const list = Array.isArray(items) ? items : [items]
  for (const item of list) visit(item, decorators, 0)
  return items
}

function visit<T extends Decoratable>(
  item: T,
  decorators: ReadonlyArray<FieldDecorator<T, string, unknown>>,
  depth: number
): void {
  if (!item) return
  const target = item as Record<string, unknown>
  for (const { field, compute } of decorators) {
    target[field] = compute(item)
  }
  if (depth >= MAX_CHILD_DEPTH - 1) return
  const children = item.children
  if (!Array.isArray(children)) return
  for (const child of children) {
    visit(child as T, decorators, depth + 1)
  }
}

export function decorateAsync<T extends Decoratable, K extends string, V>(
  items: T[],
  field: K,
  compute: DecorateFnAsync<T, V>
): Promise<Decorated<T, K, V>[]>
export function decorateAsync<T extends Decoratable, K extends string, V>(
  items: T,
  field: K,
  compute: DecorateFnAsync<T, V>
): Promise<Decorated<T, K, V>>
export function decorateAsync<T extends Decoratable, K extends string, V>(
  items: T | T[],
  field: K,
  compute: DecorateFnAsync<T, V>
): Promise<Decorated<T, K, V> | Decorated<T, K, V>[]> {
  return decorateAllAsync(items as T[], [{ field, compute }]) as Promise<
    Decorated<T, K, V> | Decorated<T, K, V>[]
  >
}

export function decorateAllAsync<T extends Decoratable>(
  items: T[],
  decorators: ReadonlyArray<FieldDecoratorAsync<T>>
): Promise<T[]>
export function decorateAllAsync<T extends Decoratable>(
  items: T,
  decorators: ReadonlyArray<FieldDecoratorAsync<T>>
): Promise<T>
export async function decorateAllAsync<T extends Decoratable>(
  items: T | T[],
  decorators: ReadonlyArray<FieldDecoratorAsync<T>>
): Promise<T | T[]> {
  const list = Array.isArray(items) ? items : [items]
  await Promise.all(list.map((item) => visitAsync(item, decorators, 0)))
  return items
}

async function visitAsync<T extends Decoratable>(
  item: T,
  decorators: ReadonlyArray<FieldDecoratorAsync<T, string, unknown>>,
  depth: number
): Promise<void> {
  if (!item) return
  const target = item as Record<string, unknown>
  await Promise.all(
    decorators.map(async ({ field, compute }) => {
      target[field] = await compute(item)
    })
  )
  if (depth >= MAX_CHILD_DEPTH - 1) return
  const children = item.children
  if (!Array.isArray(children)) return
  await Promise.all(
    children.map((child) => visitAsync(child as T, decorators, depth + 1))
  )
}
