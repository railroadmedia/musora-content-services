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

const fetchBrandDocument = <T>(type: string, brand: Brands | string) =>
  groq()
    .and(f.combine(f.type(type), f.brand(brand)))
    .first()
    .run<T>()

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
  const result = await fetchBrandDocument<FaqDocument>('faq', brand)

  if (includeWebOnly) return result

  return result.map((faq) =>
    faq ? { ...faq, questions: faq.questions?.filter((question) => !question.web_only) } : faq
  )
}

export interface MarketingBundle {
  stats: (StatsDocument & { total_student_count?: string }) | null
  practiceGoals: PracticeGoalDocument | null
  testimonials: TestimonialDocument | null
  faqs: FaqDocument | null
}

const brandDocumentQuery = (type: string, brand: Brands | string) =>
  groq().and(f.combine(f.type(type), f.brand(brand))).first()

export async function fetchMarketingAll(
  brand: Brands | string,
  includeWebOnlyFaqs: boolean = true
): Promise<Either<SanityQueryError, MarketingBundle | null>> {
  const isMusora = brand === Brands.Musora

  const result = await groq
    .composite({
      stats: brandDocumentQuery('stats', brand),
      ...(isMusora ? {} : { musoraStats: brandDocumentQuery('stats', Brands.Musora) }),
      practiceGoals: brandDocumentQuery('practice-goal', brand),
      testimonials: brandDocumentQuery('testimonial', brand),
      faqs: brandDocumentQuery('faq', brand),
    })
    .run<MarketingBundle & { musoraStats?: (StatsDocument & { total_student_count?: string }) | null }>()

  const merged = result.map((bundle) => {
    if (!bundle) return bundle

    const { musoraStats, ...rest } = bundle

    return {
      ...rest,
      stats: isMusora
        ? rest.stats
        : rest.stats
          ? { ...rest.stats, total_student_count: musoraStats?.total_student_count }
          : rest.stats,
    }
  })

  if (includeWebOnlyFaqs) return merged

  return merged.map((bundle) =>
    bundle
      ? {
          ...bundle,
          faqs: bundle.faqs
            ? {
                ...bundle.faqs,
                questions: bundle.faqs.questions?.filter((question) => !question.web_only),
              }
            : bundle.faqs,
        }
      : bundle
  )
}
