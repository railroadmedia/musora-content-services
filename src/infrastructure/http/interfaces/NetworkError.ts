export interface NetworkError {
  message: string
  url: string
  method: string
  originalError: Error
}
