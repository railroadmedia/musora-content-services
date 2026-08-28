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
