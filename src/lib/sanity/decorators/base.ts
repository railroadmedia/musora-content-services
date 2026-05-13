export interface Decoratable {
  children?: Decoratable[]
  [key: string]: unknown
}

export type DecorateFn<T extends Decoratable, V> = (item: T) => V

export type DecorateFnAsync<T extends Decoratable, V> = (item: T) => Promise<V>

export interface FieldDecorator<T extends Decoratable, V = unknown> {
  field: string
  compute: DecorateFn<T, V>
}

export interface FieldDecoratorAsync<T extends Decoratable, V = unknown> {
  field: string
  compute: DecorateFnAsync<T, V>
}

const MAX_CHILD_DEPTH = 3

export function decorate<T extends Decoratable, V>(
  items: T | T[],
  field: string,
  compute: DecorateFn<T, V>
): T | T[] {
  return decorateAll(items, [{ field, compute }])
}

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
  decorators: ReadonlyArray<FieldDecorator<T>>,
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

export function decorateAsync<T extends Decoratable, V>(
  items: T | T[],
  field: string,
  compute: DecorateFnAsync<T, V>
): Promise<T | T[]> {
  return decorateAllAsync(items, [{ field, compute }])
}

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
  decorators: ReadonlyArray<FieldDecoratorAsync<T>>,
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
