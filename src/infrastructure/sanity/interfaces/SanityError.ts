export interface SanityError {
  message: string
  query?: string
  params?: Record<string, any>
  originalError?: any
} 