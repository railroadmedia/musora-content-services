const NON_BREAKING_SPACE_ENTITY = /&(nbsp|#160|#x0*a0);/gi
const ANY_ENTITY = /&(#\d+|#x[0-9a-f]+|[a-z][a-z0-9]*);/gi

export function hasVisibleText(html: string | null | undefined): boolean {
  if (!html) {
    return false
  }

  const text = html
    .replace(/<[^>]*>/g, '')
    .replace(NON_BREAKING_SPACE_ENTITY, ' ')
    .replace(ANY_ENTITY, 'x')

  return text.trim().length > 0
}
