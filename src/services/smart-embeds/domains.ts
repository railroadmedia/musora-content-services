export const VALID_BRANDS = ['drumeo', 'pianote', 'guitareo', 'singeo', 'playbass'] as const

export type ValidBrand = (typeof VALID_BRANDS)[number]

// Root domains for Musora and each brand. Any hostname that IS one of these, or is a
// subdomain of one of these (www., app., devapp., staging., beta., etc.), is internal —
// so new subdomains don't require touching this file.
const ROOT_DOMAINS: readonly string[] = ['musora.com', ...VALID_BRANDS.map((brand) => `${brand}.com`)]

const LOCAL_HOSTS: readonly string[] = ['localhost', '127.0.0.1']

export const INTERNAL_DOMAINS: readonly string[] = [...ROOT_DOMAINS, ...LOCAL_HOSTS]

export function isInternalHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase()

  if (LOCAL_HOSTS.includes(lower)) {
    return true
  }

  return ROOT_DOMAINS.some((root) => lower === root || lower.endsWith(`.${root}`))
}

export const TRACKING_PARAMS_TO_REMOVE = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid',
  'msclkid',
  'ref',
  'source',
] as const

export function isValidBrand(brand: string): brand is ValidBrand {
  return VALID_BRANDS.includes(brand as ValidBrand)
}
