export const VALID_BRANDS = ['drumeo', 'pianote', 'guitareo', 'singeo', 'playbass'] as const

export type ValidBrand = (typeof VALID_BRANDS)[number]

export const INTERNAL_DOMAINS: readonly string[] = [
  // Production domains - Musora
  'www.musora.com',
  'musora.com',

  // Production domains - Brand specific
  'www.drumeo.com',
  'drumeo.com',
  'www.pianote.com',
  'pianote.com',
  'www.guitareo.com',
  'guitareo.com',
  'www.singeo.com',
  'singeo.com',
  'www.playbass.com',
  'playbass.com',

  // Staging/Beta domains
  'staging.musora.com',
  'beta.musora.com',
  'staging.drumeo.com',
  'beta.drumeo.com',
  'staging.pianote.com',
  'beta.pianote.com',
  'staging.guitareo.com',
  'beta.guitareo.com',
  'staging.singeo.com',
  'beta.singeo.com',
  'staging.playbass.com',
  'beta.playbass.com',

  // Development/Local domains
  'localhost',
  '127.0.0.1',
]

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
