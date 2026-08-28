import { Brands } from '../../lib/brands'
import { Filters as f } from '../../lib/sanity/filter'
import { groq } from '../../lib/sanity/groq'
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
    .then((result) => result.recover(null))

export async function fetchMarketingStats(brand: Brands | string): Promise<StatsDocument | null> {
  return fetchBrandDocument<StatsDocument>('stats', brand)
}

export async function fetchMarketingPracticeGoals(
  brand: Brands | string
): Promise<PracticeGoalDocument | null> {
  return fetchBrandDocument<PracticeGoalDocument>('practice-goal', brand)
}

export async function fetchMarketingTestimonials(
  brand: Brands | string
): Promise<TestimonialDocument | null> {
  return fetchBrandDocument<TestimonialDocument>('testimonial', brand)
}

export async function fetchMarketingFaqs(
  brand: Brands | string,
  includeWebOnly: boolean = true
): Promise<FaqDocument | null> {
  const faq = await fetchBrandDocument<FaqDocument>('faq', brand)

  if (!faq || includeWebOnly) return faq

  return { ...faq, questions: faq.questions?.filter((question) => !question.web_only) }
}
