import { Brands } from '../../lib/brands'
import type { Either } from '../../lib/ads/either'
import { Filters as f } from '../../lib/sanity/filter'
import { groq } from '../../lib/sanity/groq'
import { SanityQueryError } from '../../lib/sanity/runner'
import type {
  FaqDocument,
  PracticeGoalDocument,
  StatsDocument,
  TestimonialDocument,
} from '../../lib/sanity/types/marketing'

const excludeFromGeneratedIndex = ['brandDocumentQuery', 'faqProjection', 'statsProjection']

export function brandDocumentQuery(type: string, brand: Brands | string, projection?: string[]) {
  const builder = groq().and(f.combine(f.type(type), f.brand(brand))).first()
  return projection ? builder.select(...projection) : builder
}

const fetchBrandDocument = <T>(type: string, brand: Brands | string, projection?: string[]) =>
  brandDocumentQuery(type, brand, projection).run<T>()

export function faqProjection(includeWebOnly: boolean): string[] | undefined {
  return includeWebOnly ? undefined : ['...', 'questions[!web_only]']
}

export function statsProjection(isMusora: boolean): string[] | undefined {
  if (isMusora) return undefined

  const musoraFilter = f.combine(f.type('stats'), f.brand(Brands.Musora))
  return ['...', `"total_student_count": *[${musoraFilter}][0].total_student_count`]
}

export async function fetchMarketingStats(
  brand: Brands | string
): Promise<Either<SanityQueryError, StatsDocument | null>> {
  return fetchBrandDocument<StatsDocument>('stats', brand)
}

export async function fetchMarketingPracticeGoals(
  brand: Brands | string
): Promise<Either<SanityQueryError, PracticeGoalDocument | null>> {
  return fetchBrandDocument<PracticeGoalDocument>('practice-goal', brand)
}

export async function fetchMarketingTestimonials(
  brand: Brands | string
): Promise<Either<SanityQueryError, TestimonialDocument | null>> {
  return fetchBrandDocument<TestimonialDocument>('testimonial', brand)
}

export async function fetchMarketingFaqs(
  brand: Brands | string,
  includeWebOnly: boolean = true
): Promise<Either<SanityQueryError, FaqDocument | null>> {
  return fetchBrandDocument<FaqDocument>('faq', brand, faqProjection(includeWebOnly))
}

export interface MarketingBundle {
  stats: (StatsDocument & { total_student_count?: string }) | null
  practiceGoals: PracticeGoalDocument | null
  testimonials: TestimonialDocument | null
  faqs: FaqDocument | null
}

export async function fetchMarketingAll(
  brand: Brands | string,
  includeWebOnlyFaqs: boolean = true
): Promise<Either<SanityQueryError, MarketingBundle | null>> {
  const isMusora = brand === Brands.Musora

  return groq
    .composite({
      stats: brandDocumentQuery('stats', brand, statsProjection(isMusora)),
      practiceGoals: brandDocumentQuery('practice-goal', brand),
      testimonials: brandDocumentQuery('testimonial', brand),
      faqs: brandDocumentQuery('faq', brand, faqProjection(includeWebOnlyFaqs)),
    })
    .run<MarketingBundle>()
}
